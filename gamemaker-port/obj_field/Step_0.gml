/// obj_field -- Step
// Ticks the grow timers, reverts the hint after its window, and handles
// every tap. Touch maps onto the mouse API automatically in GameMaker, so
// this one path covers desktop testing and the eventual mobile export.

layout();
settle();

if (hint_until >= 0 && date_current_datetime() >= hint_until) {
	hint_until = -1;
	hint_text = (tool == "") ? "Pick a tool to begin."
		: (tool == "seeds"  ? "Tap an empty plot to sow."
		: (tool == "water"  ? "Tap a sown plot to water it."
		: "Tap a ripe plot to harvest."));
}

if (mouse_check_button_pressed(mb_left)) {
	var mx = device_mouse_x_to_gui(0);
	var my = device_mouse_y_to_gui(0);

	// the seed picker, when open, eats every tap until a choice is made
	if (seed_picker_open) {
		for (var s = 0; s < array_length(seed_rects); s++) {
			var r = seed_rects[s];
			if (mx >= r.x1 && mx <= r.x2 && my >= r.y1 && my <= r.y2) {
				seed_choice = r.id;
				tool = "seeds";
				seed_picker_open = false;
				show_hint(crops[$ r.id].name + " -- tap an empty plot to sow.");
				exit;
			}
		}
		seed_picker_open = false;   // tapped elsewhere -- close it, plant nothing
		exit;
	}

	// tool bar
	for (var t = 0; t < array_length(tool_rects); t++) {
		var r = tool_rects[t];
		if (mx >= r.x1 && mx <= r.x2 && my >= r.y1 && my <= r.y2) {
			if (r.name == "seeds") {
				seed_picker_open = true;
			} else if (tool == r.name) {
				tool = "";              // tap the held tool again to drop it
				hint_text = "Pick a tool to begin.";
			} else {
				tool = r.name;
				hint_text = (r.name == "water") ? "Tap a sown plot to water it."
					: "Tap a ripe plot to harvest.";
			}
			exit;
		}
	}

	// the plots
	for (var i = 0; i < array_length(plot_rects); i++) {
		var r = plot_rects[i];
		if (mx >= r.x1 && mx <= r.x2 && my >= r.y1 && my <= r.y2) {
			touch_plot(i);
			exit;
		}
	}
}
