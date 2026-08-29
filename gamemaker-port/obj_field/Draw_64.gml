/// obj_field -- Draw GUI
// Everything below is procedural -- rectangles, the default font, no
// sprites. Matches the brief's "function over aesthetics" call for v1;
// swapping in real art later only touches this event, nothing else.

var gw = display_get_gui_width();
var gh = display_get_gui_height();

draw_set_colour(col_bg);
draw_rectangle(0, 0, gw, gh, false);

draw_set_halign(fa_center);
draw_set_valign(fa_top);
draw_set_colour(col_text);
draw_text(gw / 2, gh * 0.035, "The Field");
draw_set_colour(col_dim);
draw_text(gw / 2, gh * 0.075, "Six plots of turned earth");

// ------------------------------------------------------------------- XP bar
var prog = level_progress(farming_xp);
var xp_y = gh * 0.115;
draw_set_halign(fa_left);
draw_set_colour(col_text);
draw_text(gw * 0.045, xp_y, "Farming -- Level " + string(prog.level));
draw_set_halign(fa_right);
draw_set_colour(col_dim);
draw_text(gw * 0.955, xp_y, string(prog.into) + " / " + string(prog.need));

var bar_y = xp_y + gh * 0.03;
var bar_x1 = gw * 0.045, bar_x2 = gw * 0.955;
draw_set_colour(col_panel2);
draw_rectangle(bar_x1, bar_y, bar_x2, bar_y + 6, false);
var frac = (prog.need > 0) ? clamp(prog.into / prog.need, 0, 1) : 1;
draw_set_colour(col_green);
draw_rectangle(bar_x1, bar_y, bar_x1 + (bar_x2 - bar_x1) * frac, bar_y + 6, false);

// -------------------------------------------------------- seed picker OR plots
if (seed_picker_open) {
	draw_set_halign(fa_left);
	draw_set_valign(fa_middle);
	for (var s = 0; s < array_length(seed_rects); s++) {
		var r = seed_rects[s];
		var c = crops[$ r.id];
		var count = bag_get(c.seedName);

		draw_set_colour(col_panel);
		draw_roundrect_ext(r.x1, r.y1, r.x2, r.y2, 14, 14, false);

		draw_set_colour(c.col);
		draw_ellipse(r.x1 + 34, (r.y1 + r.y2) / 2, r.x1 + 14, (r.y1 + r.y2) / 2 + 14, false);

		draw_set_colour(count < 1 ? col_dim : col_text);
		draw_text(r.x1 + 60, r.y1 + (r.y2 - r.y1) * 0.35, c.name);
		draw_set_colour(col_dim);
		draw_text(r.x1 + 60, r.y1 + (r.y2 - r.y1) * 0.65,
			string(c.waters) + " watering, " + string(c.seconds) + "s -- " + string(count) + " left");
	}
} else {
	for (var i = 0; i < array_length(plot_rects); i++) {
		var r = plot_rects[i];
		var p = plots[i];
		var status = plot_status(p);
		var wet = (status == "growing");

		draw_set_colour(wet ? col_soil_wet : col_soil);
		draw_roundrect_ext(r.x1, r.y1, r.x2, r.y2, 12, 12, false);

		// border: gold when ripe, blue-target/green-target when the held
		// tool can act here, otherwise none
		var can = can_use(tool, status);
		if (status == "ripe") draw_set_colour(col_gold);
		else if (can && tool == "water") draw_set_colour(col_water);
		else if (can) draw_set_colour(col_green);
		else draw_set_colour(-1);
		if (can || status == "ripe") {
			draw_set_alpha(0.9);
			draw_roundrect_ext(r.x1 + 1, r.y1 + 1, r.x2 - 1, r.y2 - 1, 12, 12, true);
			draw_set_alpha(1);
		}

		var cx = (r.x1 + r.x2) / 2;
		var cy = (r.y1 + r.y2) / 2;
		draw_set_halign(fa_center);
		draw_set_valign(fa_middle);

		if (p.crop != "") {
			var c = crops[$ p.crop];
			draw_set_colour(c.col);
			draw_text(cx, cy - 10, c.name);
			draw_set_colour(col_dim);
			draw_text(cx, cy + 12, "stage " + string(p.stage) + "/" + string(c.waters));

			// growth progress -- a bar along the bottom, not a ring, kept
			// simple on purpose for this first pass
			if (status == "growing") {
				var t = clamp((date_current_datetime() - p.started_at)
					/ (p.ready_at - p.started_at), 0, 1);
				draw_set_colour(col_panel2);
				draw_rectangle(r.x1 + 8, r.y2 - 10, r.x2 - 8, r.y2 - 6, false);
				draw_set_colour(col_green);
				draw_rectangle(r.x1 + 8, r.y2 - 10, r.x1 + 8 + (r.x2 - r.x1 - 16) * t, r.y2 - 6, false);
			}
		} else {
			draw_set_colour(col_dim);
			draw_text(cx, cy, "empty");
		}
	}
}

// ----------------------------------------------------------------- tool bar
for (var t = 0; t < array_length(tool_rects); t++) {
	var r = tool_rects[t];
	var active = (tool == r.name) || (r.name == "seeds" && seed_picker_open);

	draw_set_colour(active ? col_green : col_panel);
	draw_roundrect_ext(r.x1, r.y1 + (active ? 2 : 0), r.x2, r.y2 + (active ? 2 : 0), 12, 12, false);

	draw_set_halign(fa_center);
	draw_set_valign(fa_middle);
	draw_set_colour(active ? col_bg : col_text);
	draw_text((r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2, r.label);
}

// -------------------------------------------------------------------- hint
draw_set_halign(fa_center);
draw_set_valign(fa_top);
draw_set_colour(col_dim);
draw_text_ext(gw / 2, gh * 0.955, hint_text, -1, gw * 0.9);
