# -*- coding: utf-8 -*-
# Generated by Django 1.9 on 2016-11-24 06:46
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Show',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, unique=True)),
                ('slug', models.SlugField()),
                ('owner', models.CharField(max_length=255)),
                ('published', models.BooleanField(default=False)),
                ('date_added', models.DateTimeField(auto_now_add=True)),
                ('viewer_file', models.FileField(upload_to=b'viewer')),
                ('beats_file', models.FileField(upload_to=b'beats')),
                ('audio_file', models.FileField(upload_to=b'audio')),
            ],
        ),
    ]
