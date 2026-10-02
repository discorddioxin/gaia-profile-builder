# GaiaOnline Profile HTML Specification

## Purpose

This document defines the HTML structure expected by the profile builder for GaiaOnline-style V2 profiles. It covers the required page shell, three-column layout, supported panels, child elements, data attributes, and import constraints.

The specification separates:

- Required V2 layout structure
- Shared panel structure
- Supported dedicated components
- Optional profile sections
- Editing and import rules

## V2 Support Requirement

Only V2 profiles are supported by the importer.

An imported document must contain all three column elements:

```html
<div id="columns">
  <div id="column_1" class="column focus_column"></div>
  <div id="column_2" class="column focus_column"></div>
  <div id="column_3" class="column focus_column"></div>
</div>
```

The importer aborts if any of these elements are missing:

- `#columns`
- `#column_1`
- `#column_2`
- `#column_3`

Failure message:

```text
Only V2 profiles supported. The imported HTML must include #columns with #column_1, #column_2, and #column_3.
```

## Document Shell

A complete imported profile should use a standard document structure:

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1000, initial-scale=1">

  <!-- Optional linked stylesheets. Order matters. -->
  <link rel="stylesheet" href="/path/to/profile.css">

  <!-- Optional inline profile styles. Order matters. -->
  <style>
    /* Profile CSS */
  </style>
</head>
<body id="viewer" class="js">
  <!-- Gaia profile content -->
</body>
</html>
```

### Body Rules

- The body may have an id such as `viewer`.
- The body may have multiple classes.
- Body background images, colors, repeat rules, and positioning must be preserved.
- Body-level CSS may control the entire profile surface.
- JavaScript is not supported by the importer and must be removed or ignored.

## Gaia Header

The optional Gaia header usually appears before the profile columns:

```html
<div id="gaia_header">
  <ul id="header_left">
    <li class="spacer"></li>
    <li><a href="/"><img src="logo.gif" alt="Gaia"></a></li>
    <li><a href="/mygaia/">My Gaia</a></li>
    <li><a href="/market/">Shops</a></li>
    <li><a href="/forum/">Forums</a></li>
    <li><a href="/world/">World</a></li>
    <li><a href="/games/">Games</a></li>
  </ul>

  <ul id="header_right">
    <li><a href="/profiles/user/123/">Username</a></li>
    <li><a href="/profiles/user/123/?mode=edit">Edit My Profile Layout</a></li>
    <li><a href="/auth/logout/">Sign Out</a></li>
    <li><a href="/gaia/report.php">Report this Profile</a></li>
  </ul>
</div>
```

The header is optional for imported profile editing, but if present it must remain in the raw HTML output.

## Column Layout

All layout panels should be descendants of one of the three V2 columns:

```html
<div id="columns">
  <div id="column_1" class="column focus_column">
    <!-- panels -->
  </div>
  <div id="column_2" class="column focus_column">
    <!-- panels -->
  </div>
  <div id="column_3" class="column focus_column">
    <!-- panels -->
  </div>
</div>
```

### Layout Rules

- Components should be moved between columns by changing their DOM parent.
- Components should not be positioned by arbitrary editor-only overlays.
- The column layout controls vertical stacking and reflow.
- A panel's authored CSS controls its width, height, position mode, margins, and internal layout.
- Reordering a panel means changing its sibling order within its column.
- Dedicated components should not be moved outside `#column_1`, `#column_2`, or `#column_3`.

## Shared Panel Contract

Most Gaia profile sections use this structure:

```html
<div class="panel COMPONENT_CLASS" id="COMPONENT_ID">
  <h2 id="COMPONENT_TITLE_ID">Panel Title</h2>
  <!-- component content -->
  <div class="clear"></div>
</div>
```

### Shared Panel Expectations

- The outer `.panel` element is the component root.
- The component root must be selectable as one unit in Component mode.
- Child nodes remain inspectable in Deep mode and the hierarchy tree.
- A panel may have a semantic class such as `comments_panel` or `wish_list_panel`.
- A panel may have an id used by original Gaia CSS.
- Empty ids are valid in legacy profiles and must not be treated as unique identifiers.
- `data-bb-id` is an editor-only identity and must not be exported.

## Supported Components

### Details

Root:

```html
<div class="panel details_panel" id="id_details">
  <h2 id="details_title">Details</h2>
  <input type="hidden" id="avatarnonce" value="">
  <p>
    <img src="" alt="" width="120" height="150">
  </p>
  <div class="forum_userstatus">
    <div class="statuslinks">
      <div class="pushBox" data-uid="">&nbsp;</div>
      <span class="online"></span>
    </div>
  </div>
  <p><strong>Last Login:</strong></p>
  <p><strong>Registered:</strong></p>
</div>
```

Semantic roles:

- `details-panel`
- `details-title`
- `details-avatar-nonce`
- `details-avatar-wrap`
- `details-avatar`
- `details-status`
- `details-status-links`
- `details-pushbox`
- `details-online`
- `details-last-login`
- `details-registered`

### Equipped List

Root:

```html
<div class="panel equipped_list_panel" id="id_equipment">
  <h2 id="equipment_title">Equipped List</h2>
  <div class="item">
    <a href="" class="item_info" id="" name="" title="">
      <img src="" alt="" height="30" width="30">
      <img src="" alt="" class="premium_sparkle">
    </a>
  </div>
  <div class="clear"></div>
</div>
```

Semantic roles:

- `equipment-panel`
- `equipment-title`
- `equipment-item`
- `equipment-item-link`
- `equipment-item-image`
- `equipment-premium-sparkle`

### Contact

```html
<div class="panel contact_panel" id="id_contact">
  <h2 id="contact_title">Contact</h2>
  <ul>
    <li><a href="">Add to Friends</a></li>
    <li><a href="">Send Message</a></li>
    <li><a href="">Trade Items</a></li>
  </ul>
</div>
```

Semantic roles:

- `contact-panel`
- `contact-title`
- `contact-list`
- `contact-action`
- `contact-add-friend`
- `contact-message`
- `contact-trade`

### Forums

```html
<div id="id_forum" class="panel forums_panel">
  <h2 id="forum_title">Forums</h2>
  <p><strong>Posts per Day:</strong> 0.57</p>
  <p><strong>Total Posts:</strong> 4448</p>
  <p><a href="">Latest Posts</a></p>
</div>
```

### Signature

```html
<div class="panel postcontent signature_panel" id="id_signature">
  <h2 id="signature_title">Signature</h2>
  <p></p>
  <div class="postcontent-align-center" style="text-align: center">
    <span style="color: crimson">Signature content</span>
    <div class="clear"></div>
  </div>
</div>
```

### House

```html
<div id="id_house" class="panel house_panel">
  <h2 id="house_title">House</h2>
  <object classid="" width="200" height="200" style=""></object>
  <div align="center">
    <a href="" class="header-launcher" data-launchtype="towns">Visit My House</a>
  </div>
</div>
```

### Recent Visitors / Footprints

```html
<div class="panel" id="id_footprints">
  <h2 id="footprints_title">Recent Visitors</h2>
  <div class="item">
    <a href="https://www.gaiaonline.com/profiles/user/123/">Username</a>
    on 08/27/2026
  </div>
  <div class="clear"></div>
</div>
```

### About

```html
<div class="panel about_panel postcontent" id="id_about">
  <h2 id="about_title">About</h2>
  <div class="clear"></div>
</div>
```

The `.postcontent` class is significant because it commonly carries imported profile typography and spacing rules.

### Store

```html
<div id="id_store" class="panel store_panel postcontent">
  <h2 id="store_title">Store</h2>
  <h3></h3>
  <p>&nbsp;</p>
  <p><a href="/marketplace/userstore/123">View Store</a></p>
</div>
```

### Badges

```html
<div class="panel" id="id_badges">
  <h2 id="badges_title">Badges</h2>
  <ul id="badges">
    <li>
      <img src="" class="clickable badge_122" data-tooltip="">
    </li>
  </ul>
  <div class="clear"></div>
  <a href="" id="badge_display">View More Badges</a>
</div>
```

### Comments

```html
<div class="panel comments_panel" id="id_comments">
  <h2 id="comments_title">Comments</h2>
  <div>
    <span id="alert_container"><a href="">Add Comment</a></span>
    <span id="alerts_banner"><a href="">Alert Me of Comments</a></span>
    <div class="clear"></div>
  </div>
  <p><a href="">View All Comments</a></p>
  <dl class="style1">
    <dt data-comment-id="" data-user-id="">
      <span class="username"><a href=""></a></span>
      <span class="date"><a href="">Report</a> | 08/02/2026 7:18 am</span>
    </dt>
    <dd data-comment-id="" data-user-id="">
      <p class="deletecomment"><a href="">Delete</a><br><a href="">Comment Back</a></p>
      <div class="dropBox"><img src="" class="avatarImage" width="48" height="48"></div>
      <div class="postcontent"></div>
    </dd>
  </dl>
</div>
```

### Wishlist

```html
<div class="panel wish_list_panel profile" id="id_wishlist">
  <h2 id="wishlist_title">Wish List</h2>
  <div class="item">
    <a href="/marketplace/itemdetail/22873" class="item_info" title="Questing">
      <img src="" alt="Item" height="30" width="30">
    </a>
  </div>
</div>
```

### Journal

```html
<div class="panel journal_panel postcontent" id="id_journal">
  <h2 id="journal_title">Journal</h2>
  <p><a href="">View Journal</a></p>
  <h3></h3>
  <p></p>
  <ul id="entries">
    <li><a href=""><span class="journal-date"></span></a></li>
  </ul>
</div>
```

### Friends

```html
<div class="panel friends_panel" id="id_friends">
  <h2 id="friends_title">Friends</h2>
  <p><a href="">View All Friends</a></p>
  <ul class="style2">
    <li>
      <p><span><a href="" title=""></a></span></p>
    </li>
  </ul>
</div>
```

### Custom Panel

```html
<div id="id_custom_####" class="panel custom_panel postcontent">
  <h2 id="custom_####_title">Custom</h2>
  <div id="custom_####_content"></div>
  <div class="clear"></div>
</div>
```

Custom panels are component roots. Their content is expected to retain the original HTML, class names, ids, inline styles, and child structure.

## CSS Source Order

The importer/editor must preserve these sources in order:

1. `<link rel="stylesheet">` nodes in `<head>`
2. `<style>` nodes in `<head>`
3. inline `style="..."` attributes
4. editor-only selection styles, loaded last and scoped to `data-bb-*` attributes

Editor-only styles must never overwrite imported profile selectors except for temporary selection outlines.

## Editor Identity Attributes

The editor may add temporary attributes:

- `data-bb-id`
- `data-bb-selected`
- `data-bb-multi-selected`
- `data-bb-group`
- `data-bb-in-group`
- `data-bb-moving`

These attributes are for editor state only and must be stripped from exported HTML.

## Security Rules

Before parsing/rendering:

- Remove `<script>` blocks.
- Remove inline event handlers such as `onclick` and `onload`.
- Neutralize `javascript:` URLs.
- Do not execute imported scripts.
- Keep imported HTML/CSS isolated from the builder application.

## Component Editing Rules

- Component mode selects a panel root.
- Deep mode selects nested children.
- Shift-click may select multiple component roots.
- Grouping wraps selected siblings in a real DOM container.
- Moving V2 panels changes their DOM position inside `#column_1`, `#column_2`, or `#column_3`.
- Styling a group applies properties to group members.

## Validation Checklist

- The document contains `#columns` and all three V2 columns.
- `#columns` remains the layout owner.
- Imported links and stylesheets remain in `<head>` order.
- Inline style attributes remain attached to their original elements.
- Body/html background rules remain intact.
- Complex panel CSS is not replaced by builder fallback CSS.
- `#id_custom_####` panels remain editable as units.
- No scripts execute during import, editing, preview, or export.