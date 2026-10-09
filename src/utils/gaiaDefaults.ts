/**
 * Gaia V2 profile defaults — the stock styling a V2 profile page renders with
 * before a single line of custom CSS is applied.
 *
 * Assembled from Gaia's own published Profile V2 stylesheets (the
 * `s.cdn.gaiaonline.com/src/css/profiles/v2/*` files every current profile
 * loads, build `?v=1174`) plus the stock theme block Gaia prints into the
 * profile `<head>`. The live CDN now answers AccessDenied, so re-read them
 * from the archive: `https://web.archive.org/web/<id_>/http://s.cdn.gaiaonline.com/src/css/profiles/v2/<name>.css`,
 * and the theme block with `https://api.microlink.io/?url=<archived profile url>&meta=false&data.theme.selector=head%20%3E%20style%3Anth-of-type(2)&data.theme.type=text`.
 *
 * The sheets behind it:
 *
 *   • v2/common.css       — reset, type scale, the #columns shell, item lists
 *   • v2/panels.css       — the .panel surface + per-component panel rules
 *   • v2/decorations.css  — the .decoration widgets
 *   • the "User-chosen Profile Theme" block. Its first rules are byte-identical
 *     on profiles that never changed their theme, so they *are* Gaia's default
 *     theme: blue #3D8AD0 panel headers, #D37B14 links, 15px panel padding.
 *
 * Preview-only. `GAIA_V2_DEFAULT_CSS` is rendered by the Tools labs and the
 * builder's panel canvas so both show the profile the way Gaia will; it is
 * never emitted into the copy-paste output, because the user pastes our CSS
 * into Profile Preferences → Theme Override CSS, which Gaia loads *after*
 * these sheets — so our overrides win without `!important`.
 *
 * Deliberate, preview-only deviations:
 *   • Site chrome (`#gaia_header`, `#modal`, `#alerts_banner`, …) is left out;
 *     previews never draw the site frame around the profile.
 *   • `#columns` keeps Gaia's widths and floats but is positioned relatively:
 *     Gaia pins it under the 170px `#header` banner with `top: 172px`, which
 *     would paint an empty band in a preview showing the columns block alone.
 *   • The theme's wallpaper tile (`/images/profiles/v2/backgrounds/bg_wallpaper.jpg`)
 *     is no longer served by the CDN, so the page keeps the plain
 *     `GAIA_DEFAULT_PAGE_BACKGROUND` surface.
 *   • The IE-only `width:expression(...)` image guards and the editor-only
 *     `.dd_panel` rule are dropped.
 */

/** Plain page surface behind the columns (see the wallpaper note above). */
export const GAIA_DEFAULT_PAGE_BACKGROUND = '#ffffff';

/** Default theme panel-header bar — Gaia blue, from the stock theme block. */
export const GAIA_PANEL_HEADER_BACKGROUND = '#3D8AD0';

/** Default theme link colour; the stock block overrides common.css' #BD8440. */
export const GAIA_LINK_COLOR = '#D37B14';

/** Panel body type size from v2/panels.css — the base V2 component font size. */
export const GAIA_PANEL_FONT_SIZE = 10;

/**
 * Builder sentinel for "this element has no font-size override of its own".
 * Elements created at this size emit no `font-size` rule, so they keep Gaia's
 * own panel type size.
 */
export const GAIA_NEUTRAL_FONT_SIZE = 13;

export const GAIA_V2_DEFAULT_CSS = `/* ==========================================================================
   Gaia Profile V2 defaults — v2/common.css + v2/panels.css +
   v2/decorations.css + the stock profile theme block. Preview-only.
   ========================================================================== */

/* --- v2/common.css -------------------------------------------------------- */

* { margin: 0; padding: 0; }

html,
body { width: 100%; height: 100%; }

h1 { font-size: 16px; }
h2 { font-size: 14px; text-align: left; }
h3 { font-size: 12px; }
a { color: #BD8440; font-weight: bold; text-decoration: none; }
a:hover { text-decoration: underline; }
img { border: 0; }
li { list-style-type: none; }
.clear { clear: both; }
p { margin-bottom: 10px; }
#header { width: 100%; height: 170px; font-size: 10px; position: relative; top: 0; left: 0; }
.journal-date { font-size: x-small; }

/* Columns — Gaia's shell owns layout and reflow. */
#columns { position: relative; overflow: hidden; float: left; }
#column_1,
#column_2,
#column_3 { float: left; overflow: hidden; }
#column_1 { width: 230px; margin-left: 25px; display: inline; }
#column_2 { width: 500px; margin: 0 10px; }
#column_3 { width: 230px; }
#column_1 img { max-width: 205px; }
#column_2 img { max-width: 475px; }
#column_3 img { max-width: 205px; }

/* Item lists */
#id_badges li,
#id_equipment li { float: left; margin: 0 3px; }
#id_badges img { height: 60px; width: 60px; }
#id_equipment img { height: 30px; width: 30px; }
#id_equipment .clickable,
#id_badges .clickable { cursor: pointer; }
#id_wishlist a { text-decoration: none; }

/* --- v2/panels.css -------------------------------------------------------- */

.panel { position: relative; margin-bottom: 10px; background: #FFF; font-size: ${GAIA_PANEL_FONT_SIZE}px; font-family: Verdana, Helvetica, Arial, sans-serif; padding: 10px; height: 1%; word-wrap: break-word; }
html > body .panel { height: auto; }
.details_panel { text-align: center; }
.gifts_panel li { float: left; text-align: center; padding: 0 5px; }
.gifts_panel li p { text-align: left; }
.gifts_panel img { padding: 0 5px; }
.gifts_panel .gift_anonymous { color: #333; }
.friends_panel .style1 li { float: left; width: 90px; height: 80px; text-align: center; }
.friends_panel .style2 li { float: left; width: 90px; height: 20px; text-align: center; }
.media_panel { text-align: center; }
.comments_panel #add_comment { display: none; border-bottom: 1px solid #000; border-top: 1px solid #000; padding: 10px; margin: 10px 0; }
.comments_panel #add_comment textarea { width: 100%; height: 120px; }
.comments_panel .style1 dt { clear: left; border-bottom: 1px solid #000; height: 20px; line-height: 20px; padding: 0 4px; text-align: right; }
.comments_panel .style1 dt .username { float: left; display: block; }
.comments_panel .style1 dd,
.comments_panel .style2 dd { overflow: hidden; width: 100%; margin-bottom: 5px; }
.comments_panel .style1 dd .avatar { float: left; }
.comments_panel .style1 dd p { margin-left: 72px; }
.wish_list_panel .item,
.equipped_list_panel .item { float: left; }
.house_panel { text-align: center; }
.house_panel .house_img img { width: 200px; }
.aquarium_panel { text-align: center; }
.aquarium_panel .aquarium_img img { width: 200px; }
.forums_panel { text-align: center; }
.signature_panel { text-align: center; }
.signature_panel h2 { text-align: left; }
.interests_panel .interest_tags li { display: inline; }
#friendGroup { padding: 10px; top: 172px; margin-left: 25px; margin-right: 25px; }
#friendGroup ul { margin-top: 10px; }
#friendGroup li { float: left; text-align: center; width: 100px; padding: 10px; white-space: nowrap; overflow: hidden; }

/* --- v2/decorations.css --------------------------------------------------- */

.decoration { position: absolute; min-height: 40px; }
.caption .caption_top { background: url('//s.cdn.gaiaonline.com/images/profiles/v2/caption_top.gif') no-repeat top left; width: 100px; height: 5px; position: absolute; top: -5px; }
.caption p { background: url('//s.cdn.gaiaonline.com/images/profiles/v2/caption_middle.gif') repeat-y top left; width: 100px; text-align: center; }
.caption .caption_bottom_left { background: url('//s.cdn.gaiaonline.com/images/profiles/v2/caption_bottom_left.gif') no-repeat; width: 100px; height: 21px; margin-top: -10px; }
.caption .caption_bottom_right { background: url('//s.cdn.gaiaonline.com/images/profiles/v2/caption_bottom_right.gif') no-repeat; width: 100px; height: 21px; margin-top: -10px; }
.wish_list_decoration { width: 150px; }
.wish_list_decoration .decoration_content { height: 80px; overflow-y: scroll; }
.wish_list_decoration .decoration_content li { display: inline; }
.equipped_list_decoration { width: 150px; }
.equipped_list_decoration .decoration_content { height: 80px; overflow-y: scroll; }
.equipped_list_decoration .decoration_content li { display: inline; }

/* --- Stock profile theme (the "User-chosen Profile Theme" block) ----------- */

/* Theme base: panel padding + the header-bar geometry (gray until the theme
   colour below lands, exactly the order Gaia emits). */
.panel { padding: 15px; }
.panel h2 { margin: -5px -5px 10px -5px; padding: 5px 6px; background: #aaa; text-align: left; text-transform: uppercase; font-weight: bold; color: #fff; font-size: ${GAIA_PANEL_FONT_SIZE}px; }
/* Theme colour: the default profile keeps Gaia's blue header bar + link accent. */
.panel h2 { background: ${GAIA_PANEL_HEADER_BACKGROUND}; color: #fff; }
.panel { background: #fff; color: #000; }
a { color: ${GAIA_LINK_COLOR}; }
#header a { color: ${GAIA_LINK_COLOR}; }`;

/**
 * Extra rules for a preview iframe that renders a single panel edge to edge
 * (the builder canvas), so the panel fills the element box exactly and stays
 * transparent over the canvas surface.
 */
export const GAIA_PANEL_FRAME_CSS = `html,
body { margin: 0; min-height: 100%; background: transparent; }
body { padding: 0; }
.panel { width: 100%; margin: 0; }`;
