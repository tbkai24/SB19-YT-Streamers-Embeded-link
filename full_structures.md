# SB19 Streaming Hub

## System Architecture & Technical Specification (v3)

**Version:** 3.0

---

# Project Vision

SB19 Streaming Hub is a centralized directory of streaming articles for SB19 releases.

Unlike Linktree, this platform does **not** store social links as its primary content.

Instead, every page represents an **SB19 Release Profile** (song, album, campaign, etc.) containing a curated list of streaming articles that already include embedded YouTube videos.

The website is inspired by Linktree:

* Clean
* Minimal
* Mobile-first
* No navbar
* No footer
* Large clickable cards
* Fast loading

The goal is for fans to immediately access verified streaming articles from one simple page.

---

# Core Principles

* Admin controls all published content.
* Public cannot create or edit Profiles.
* Community may only suggest article links.
* Every submission requires admin approval.
* Duplicate submissions are prevented.
* Metadata is automatically extracted.
* Every Profile acts as its own workspace.

---

# Terminology

## Profile

A Profile represents one streaming campaign.

Examples

* LAWLESS
* DAM
* GENTO
* MOONLIGHT
* FREEDOM

Each Profile contains:

* Cover Image
* Profile Image (optional)
* Title
* Description
* Official Social Links
* Streaming Articles
* Pending Article Submissions
* Appearance Settings
* SEO Settings
* Analytics

---

# User Roles

## Public Visitor

Can

* Browse Profiles
* Search Profiles
* Open Streaming Articles
* Submit Article Suggestions

Cannot

* Login
* Create Profiles
* Edit Profiles
* Publish Articles
* Delete Articles

---

## Administrator

Can

* Login
* Create Profiles
* Edit Profiles
* Delete Profiles
* Publish Profiles
* Manage Articles
* Approve Submissions
* Reject Submissions
* Manage Appearance
* Manage Social Links
* View Analytics
* Manage Settings

---

# Public Website

No navbar.

No footer.

Everything is centered.

---

## Homepage

Contains

Search

Featured Profiles

Latest Profiles

Search is instant.

Users search by

* Song
* Album
* Campaign

Example

LAWLESS

↓

Open Profile

---

# Profile Page

Layout

Cover Image

Profile Image (optional)

LAWLESS

Streaming articles containing embedded YouTube videos.

Official Social Icons

🌐 Website

📺 YouTube

📘 Facebook

📷 Instagram

🐦 X

🧵 Threads

---

Streaming Articles

---

📄 Lawless Streaming Guide

---

📄 Official Streaming Hub

---

📄 Community Streaming Guide

---

📄 Fan Streaming Hub

---

➕ Submit Article

Only configured social icons are displayed.

No empty placeholders.

---

# Streaming Article Cards

Every article is displayed as a large clickable card.

Card

Title

Website Name

Open →

Clicking opens the original article in a new tab.

The website never embeds or hosts videos directly.

---

# Search

Users can search

Song Name

Album

Campaign

Results update instantly.

---

# Community Submission

Public users can help expand the article collection.

They cannot publish.

They can only submit article URLs.

Submission always belongs to the current Profile.

Example

/lawless

↓

Submit Article

Fields

Article URL

Optional Notes

Submit

There is no Profile selector because the system already knows which Profile is active.

---

# Submission Workflow

Visitor

↓

Paste Article URL

↓

Normalize URL

↓

Fetch Metadata

↓

Check Published Articles

↓

Exists?

YES

↓

Display

"This article already exists."

END

↓

NO

↓

Check Pending Submissions

↓

Exists?

YES

↓

Display

"This article has already been submitted and is awaiting review."

END

↓

NO

↓

Create Pending Submission

↓

Admin Review

↓

Approve

↓

Publish

---

# Automatic Metadata Extraction

When the Article URL is pasted, the system automatically extracts:

* Page Title
* Open Graph Title
* Description
* Featured Image
* Website Name
* Favicon
* Canonical URL
* Published Date (if available)

Admin may edit any field before approval.

Users do not manually enter titles or thumbnails.

---

# Duplicate Detection

Before creating a submission:

Normalize URL

* Remove tracking parameters
* Remove trailing slash
* Resolve canonical URL

Check

* Published Articles
* Pending Submissions

If duplicate

Display

"This article already exists or is already pending review."

No duplicate submission is created.

---

# Admin Experience

The admin does not manage a giant list of Topics.

Instead, each Profile acts like an independent workspace.

Similar to

* Vercel Projects
* Notion Workspaces

---

# Active Profile Switcher

At the top of the Admin Dashboard

Current Profile

LAWLESS ▼

Dropdown

LAWLESS

DAM

GENTO

MOONLIGHT

* Create New Profile

Switching Profiles changes the entire workspace.

Everything now belongs to that Profile.

No need for filters.

---

# Create Profile

Fields

Title

Slug

Description

Cover Image

Profile Image (optional)

Accent Color

Theme

Publish Status

Official Website

YouTube

Facebook

Instagram

X

Threads

SEO Title

SEO Description

Create

After creation

Automatically switch into the new Profile.

---

# Admin Sidebar

Dashboard

Current Profile

Overview

Articles

Pending Submissions

Appearance

Official Social Links

SEO

Analytics

Settings

Everything automatically belongs to the active Profile.

---

# Overview

Displays

Profile Information

Article Count

Pending Count

Views

Recent Activity

Latest Updates

---

# Articles

Displays

Thumbnail

Title

Website

Status

Created

Updated

Actions

Buttons

Add

Edit

Delete

Preview

Reorder

All articles automatically belong to the active Profile.

---

# Add Article

Admin pastes

Article URL

System automatically fetches

Title

Thumbnail

Description

Website Name

Canonical URL

Admin reviews

↓

Save

---

# Pending Submissions

Displays only submissions for the active Profile.

Columns

Thumbnail

Title

Website

Submitted

Actions

Approve

Reject

Edit

Preview

Mark Duplicate

---

# Approval Workflow

Pending Submission

↓

Review Metadata

↓

Edit (optional)

↓

Approve

↓

Move to Published Articles

↓

Visible to Public

---

# Rejection Workflow

Reject

↓

Choose Reason

Duplicate

Broken Link

Spam

Wrong Profile

No Embedded Video

Other

↓

Archive Submission

---

# Appearance

Each Profile has independent branding.

Settings

Cover Image

Profile Image

Accent Color

Theme

Description

Changes update the public page immediately.

---

# Official Social Links

Supported platforms

🌐 Official Website

📺 YouTube

📘 Facebook

📷 Instagram

🐦 X

🧵 Threads

Admin Fields

Official Website URL

YouTube URL

Facebook URL

Instagram URL

X URL

Threads URL

Only populated fields appear publicly.

---

# Analytics

Analytics belong only to the active Profile.

Displays

Profile Views

Article Clicks

Top Articles

Traffic Sources

Recent Activity

Submission Count

Broken Links

Analytics are visible only to administrators.

---

# Database

## profiles

id

title

slug

description

cover_image

profile_image

accent_color

theme

website_url

youtube_url

facebook_url

instagram_url

x_url

threads_url

seo_title

seo_description

status

created_at

updated_at

---

## articles

id

profile_id

title

article_url

canonical_url

website_name

thumbnail

description

display_order

status

created_at

updated_at

---

## article_submissions

id

profile_id

article_url

canonical_url

website_name

title

thumbnail

description

notes

status

review_notes

submitted_by_name

submitted_by_email

reviewed_by

reviewed_at

created_at

updated_at

---

## analytics_events

id

profile_id

article_id

event_type

visitor_hash

country

device

referrer

created_at

---

## admins

id

email

role

created_at

---

# Folder Structure

/app

(public)

/

profile/[slug]

submit

(admin)

dashboard

overview

articles

submissions

appearance

analytics

settings

/components

/features

profiles

articles

submissions

search

analytics

/lib

/services

/utils

/types

/supabase

/cloudinary

/public

/styles

---

# Cloudinary Structure

SB19/

profiles/

lawless/

cover.jpg

avatar.jpg

thumbnails/

dam/

moonlight/

gento/

---

# Security

Supabase Authentication

Row Level Security

Admin-only CRUD

Public Read Access

Submission Rate Limiting

Spam Protection

Future CAPTCHA

---

# SEO

Static Profile Pages

Open Graph Metadata

Twitter Cards

Structured Data

Sitemap

Canonical URLs

---

# Performance

Server Components

Image Optimization

Lazy Loading

Caching

Incremental Static Regeneration

Edge Functions

---

# Future Features

* Broken Link Checker
* Scheduled Link Validation
* AI Duplicate Detection
* AI Metadata Cleanup
* Bulk Article Import
* QR Code Sharing
* Contributor Recognition
* Link Health Monitoring
* Search Suggestions
* Shareable Short URLs

---

# Design Philosophy

## Public

* Linktree-inspired
* Minimal
* No Navbar
* No Footer
* Large Clickable Cards
* Mobile First
* Clean Typography
* Fast Loading

## Admin

* Workspace-based
* One Active Profile at a Time
* No Repetitive Filters
* Metadata Automation
* Simple Content Management
* Analytics Focused

---

# Final Philosophy

Each SB19 release is treated as its own Profile Workspace.

The public experiences a clean, Linktree-like page where they can quickly access streaming articles.

The administrator experiences a focused workspace where everything—articles, submissions, appearance, analytics, and settings—is managed within the currently selected Profile.

The result is a simple public experience paired with a powerful, scalable, and easy-to-manage administration system.
