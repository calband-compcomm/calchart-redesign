# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-06-07 23:19
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0008_user_members_only_username'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='viewpsheet_settings',
            field=models.TextField(default='{}'),
        ),
    ]
