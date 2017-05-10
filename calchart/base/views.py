from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.views import LoginView as DjangoLoginView
from django.core.exceptions import PermissionDenied
from django.core.files.storage import default_storage
from django.core.urlresolvers import reverse
from django.http.response import HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.views.generic import TemplateView, RedirectView, CreateView
from django.utils import timezone

import json, os
from datetime import timedelta

from base.forms import *
from base.menus import *
from base.mixins import CalchartMixin
from base.models import User, Show
from utils.api import get_login_url

### ENDPOINTS ###

def export(request, slug):
    """
    Return a JSON file to be downloaded automatically.
    """
    show = Show.objects.get(slug=slug)
    response = HttpResponse(show.viewer)
    response['Content-Disposition'] = f'attachment; filename={slug}.json'

    return response

### AUTH PAGES ###

class LoginView(DjangoLoginView):
    """
    Logs in a user with their Members Only credentials. When a user submits their
    credentials, send a request to the Members Only server and validate that the
    credentials are valid. If so, flag the user's session as having logged in.
    """
    template_name = 'login.html'
    redirect_authenticated_user = True

class AuthMembersOnlyView(RedirectView):
    """
    Redirects the user to Members Only, which will redirect back to Calchart after
    the user logs in (or immediately, if the user is already logged in).
    """
    def dispatch(self, request, *args, **kwargs):
        if 'username' in request.GET:
            self.login_user()
            return redirect(request.GET['next']) 
        else:
            return super().dispatch(request, *args, **kwargs)

    def get_redirect_url(self, *args, **kwargs):
        redirect_url = self.request.GET['next']
        return get_login_url(self.request, redirect_url)

    def login_user(self):
        username = self.request.GET['username']
        api_token = self.request.GET['api_token']
        ttl_days = self.request.GET['ttl_days']

        user = User.objects.filter(username=username).first()
        if user is None:
            user = User.objects.create_user(username=username)

        user.api_token = api_token
        user.api_token_expiry = timezone.now() + timedelta(days=int(ttl_days))
        user.save()

        login(self.request, user)

class CreateUserView(CreateView):
    template_name = 'create_user.html'
    form_class = CreateUserForm

    def form_valid(self, form):
        form.save()
        messages.success(self.request, 'User successfully created.')
        return redirect('login')

### CALCHART PAGES ###

class HomeView(CalchartMixin, TemplateView):
    """
    The home page that lists all shows created by the user and shared
    by the STUNT committee in a Google Drive-like format.
    """
    template_name = 'home.html'

    def get(self, request, *args, **kwargs):
        """
        Tabs are loaded with AJAX requests that contain the "tab" key
        in the query string
        """
        if 'tab' in request.GET:
            shows = self.get_tab(request.GET['tab'])
            return JsonResponse({
                'shows': [
                    {
                        'slug': show.slug,
                        'name': show.name,
                        'published': show.published,
                    }
                    for show in shows
                ],
            })
        else:
            return super().get(request, *args, **kwargs)

    def get_tab(self, tab):
        """
        Available tabs:
        - band: Shows created by STUNT for this year
        - created: Shows created by the current user
        """
        if tab == 'band':
            if not self.request.user.is_members_only_user():
                raise PermissionDenied
            return Show.objects.filter(
                is_band=True,
                date_added__year=timezone.now().year
            )

        if tab == 'created':
            return Show.objects.filter(owner=self.request.user)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # if Members Only user, shows this year's shows by default
        # otherwise, show the user's shows
        if self.request.user.is_members_only_user():
            context['tab'] = 'band'
            context['is_stunt'] = self.request.user.has_committee('STUNT')
        else:
            context['tab'] = 'created'

        return context

    def create_show(self):
        """
        A POST action that creates a show with a name and audio file
        """
        # TODO: is_band check if user is on stunt

        kwargs = {
            'name': self.request.POST['name'],
            'owner': self.request.user,
            'is_band': self.request.POST['is_band'],
            'audio_file': self.request.FILES.get('audio'),
        }
        show = Show.objects.create(**kwargs)
        return redirect('editor', slug=show.slug)

class EditorView(CalchartMixin, TemplateView):
    """
    The editor view that can edit shows
    """
    template_name = 'editor.html'
    popup_forms = editor_popups

    def dispatch(self, request, *args, **kwargs):
        self.show = Show.objects.get(slug=kwargs['slug'])
        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(EditorView, self).get_context_data(**kwargs)
        context['show'] = self.show
        context['menu'] = editor_menu
        context['toolbar'] = editor_toolbar
        context['is_local'] = settings.IS_LOCAL
        context['panels'] = [
            ('partials/panel_edit_continuity.html', 'edit-continuity'),
            ('partials/panel_edit_continuity_dots.html', 'edit-continuity-dots'),
            ('partials/panel_ftl_path.html', 'ftl-path'),
            ('partials/panel_select_dots.html', 'select-dots'),
            ('partials/panel_two_step.html', 'two-step'),
        ]
        return context

    def save_show(self):
        """
        A POST action that saves a show's JSON data.
        """
        self.show.viewer = self.request.POST['viewer']
        self.show.save()

    def upload_sheet_image(self):
        """
        A POST action that uploads an image for a given sheet in the show.
        """
        sheet = self.request.POST['sheet']
        image = self.request.FILES['image']
        filename = f'backgrounds/{self.show.slug}/{image.name}'
        if default_storage.exists(filename):
            default_storage.delete(filename)
        filename = default_storage.save(filename, image)

        return JsonResponse({
            'url': settings.MEDIA_URL + filename,
        })
