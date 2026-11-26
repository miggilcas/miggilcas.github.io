---
layout: page
title: proyectos
permalink: /es/projects/
description: Proyectos de investigación y despliegues en campo.
nav: true
nav_order: 1
lang: es
lang_ref: projects
---

<!-- pages/projects.md (bilingual: filtered by page language) -->
<div class="projects">
{%- assign cur_lang = page.lang | default: 'en' -%}
{%- if cur_lang == 'es' -%}
  {%- assign lang_projects = site.projects | where: "lang", "es" -%}
{%- else -%}
  {%- assign lang_projects = site.projects | where_exp: "p", "p.lang != 'es'" -%}
{%- endif -%}
{%- assign sorted_projects = lang_projects | sort: "importance" -%}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
</div>
