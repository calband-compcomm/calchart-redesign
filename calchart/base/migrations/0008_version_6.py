# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-05-11 23:45
from __future__ import unicode_literals

from django.db import migrations
from utils.db import UpdateShowVersion

def update_version(show):
    show['published'] = False

class Migration(migrations.Migration):

    dependencies = [
        ('base', '0007_version_5'),
    ]

    operations = [
        UpdateShowVersion(6, update_version),
    ]
