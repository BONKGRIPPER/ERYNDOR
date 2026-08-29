/// obj_field -- Create
// Aerendell -- Field/Farming, ported from the HTML/JS build. This object
// owns everything: data, state, input, drawing. No sprites yet -- every-
// thing draws procedurally with rectangles and the default font, matching
// the design brief's "function over aesthetics" priority for v1.

// ---------------------------------------------------------------- palette
col_bg        = make_colour_rgb(20, 17, 14);
col_panel     = make_colour_rgb(30, 26, 20);
col_panel2    = make_colour_rgb(38, 32, 25);
col_line      = make_colour_rgb(60, 54, 46);
col_text      = make_colour_rgb(236, 227, 210);
col_dim       = make_colour_rgb(154, 143, 125);
col_green     = make_colour_rgb(159, 208, 122);
col_gold      = make_colour_rgb(216, 189, 106);
col_water     = make_colour_rgb(120, 180, 235);
col_soil      = make_colour_rgb(74, 55, 40);
col_soil_wet  = make_colour_rgb(44, 32, 21);

// ------------------------------------------------------------------ crops
// Mirrors data.js CROPS exactly. `waters` is stage count, `seconds` is the
// whole grow time since both current crops are single-stage.
crops = {
	redBerries: {
		name: "Red Berries", seedName: "Red Berries Seeds",
		col: make_colour_rgb(194, 59, 82),
		waters: 1, seconds: 120, xp: 26,
		giveName: "Red Berries", giveAmount: 2, giveSeeds: 1,
	},
	flax: {
		name: "Flax", seedName: "Flax Seeds",
		col: make_colour_rgb(143, 179, 217),
		waters: 1, seconds: 240, xp: 50,
		giveName: "Flax", giveAmount: 2, giveSeeds: 1,
	},
};
crop_ids = ["redBerries", "flax"];

// ------------------------------------------------------------------ skill
// Same curve as skills.js: cheap early levels, steeper later, uncapped.
water_xp = 2;
growth_per_level = 0.03;

xp_to_next = function(level) {
	return floor(40 * power(level + 1, 1.7));
};

level_from_xp = function(xp) {
	var level = 0;
	var spent = 0;
	while (spent + xp_to_next(level) <= xp) {
		spent += xp_to_next(level);
		level += 1;
	}
	return level;
};

level_progress = function(xp) {
	var level = level_from_xp(xp);
	var spent = 0;
	for (var l = 0; l < level; l++) spent += xp_to_next(l);
	return { level: level, into: xp - spent, need: xp_to_next(level) };
};

// ------------------------------------------------------------------ state
plot_count = 6;
farming_xp = 0;
bag = ds_map_create();
ds_map_add(bag, "Red Berries Seeds", 6);
ds_map_add(bag, "Flax Seeds", 2);

tool = "";           // "" | "seeds" | "water" | "scythe"
seed_choice = "";
seed_picker_open = false;

// Each plot: { crop, stage, ready_at, started_at }. ready_at/started_at are
// GameMaker datetimes (a double, days since epoch); -1 means unset. Same
// deadline-not-countdown rule as the JS build -- storing the real moment
// it's ready is what makes offline growth free, no catch-up code needed.
plots = array_create(plot_count);
for (var i = 0; i < plot_count; i++) {
	plots[i] = { crop: "", stage: 0, ready_at: -1, started_at: -1 };
}

hint_text = "Pick a tool to begin.";
hint_until = -1;      // datetime the hint should revert; -1 = no timer running

// cached hit-test rectangles, recomputed every step by layout()
plot_rects = [];
tool_rects = [];
seed_rects = [];

// ---------------------------------------------------------------- helpers

bag_get = function(name) {
	return ds_map_exists(bag, name) ? bag[? name] : 0;
};

bag_add = function(name, amount) {
	bag[? name] = bag_get(name) + amount;
};

/// "empty" | "thirsty" | "growing" | "ripe" -- mirrors field.js plotStatus()
plot_status = function(p) {
	if (p.crop == "") return "empty";
	var c = crops[$ p.crop];
	if (p.stage >= c.waters) return "ripe";
	return (p.ready_at < 0) ? "thirsty" : "growing";
};

can_use = function(tool_name, status) {
	if (tool_name == "seeds")  return status == "empty";
	if (tool_name == "water")  return status == "thirsty";
	if (tool_name == "scythe") return status == "ripe";
	return false;
};

show_hint = function(text) {
	hint_text = text;
	hint_until = date_current_datetime() + (2.2 / 86400);
};

/// Awards XP and flashes the hint on a level-up, mirrors field.js gainXp().
gain_xp = function(amount) {
	var before = level_from_xp(farming_xp);
	farming_xp += amount;
	var after = level_from_xp(farming_xp);
	if (after > before) show_hint("Farming level " + string(after) + "!");
};

// ----------------------------------------------------------- plot actions

do_plant = function(i) {
	var p = plots[i];
	var c = crops[$ seed_choice];
	if (bag_get(c.seedName) < 1) {
		show_hint("No " + c.seedName + " left.");
		return;
	}
	bag_add(c.seedName, -1);
	p.crop = seed_choice;
	p.stage = 0;
	p.ready_at = -1;
	show_hint(c.name + " sown. It needs water.");
};

do_water = function(i) {
	var p = plots[i];
	var c = crops[$ p.crop];
	// The level bonus is read once, right now, and baked into this stage's
	// timer -- a crop already growing doesn't speed up mid-grow if you
	// level up, only the next one you water does.
	var speed = 1 + level_from_xp(farming_xp) * growth_per_level;
	var grow_days = (c.seconds / speed) / 86400;
	p.started_at = date_current_datetime();
	p.ready_at = p.started_at + grow_days;
	show_hint("Watered. Stage " + string(p.stage + 1) + " of " + string(c.waters) + ".");
	gain_xp(water_xp);
};

do_harvest = function(i) {
	var p = plots[i];
	var c = crops[$ p.crop];
	bag_add(c.giveName, c.giveAmount);
	bag_add(c.seedName, c.giveSeeds);
	show_hint("Harvested " + c.name + ". +" + string(c.giveAmount) + " " + c.giveName + ".");
	gain_xp(c.xp);
	p.crop = "";
	p.stage = 0;
	p.ready_at = -1;
};

wrong_tool = function(status) {
	if (tool == "seeds") {
		if (status == "thirsty") show_hint("Already sown.");
		else if (status == "growing") show_hint("Already growing.");
		else if (status == "ripe") show_hint("That's ripe -- use the scythe.");
	} else if (tool == "water") {
		if (status == "empty") show_hint("Nothing planted here.");
		else if (status == "growing") show_hint("Already watered.");
		else if (status == "ripe") show_hint("That's ripe -- use the scythe.");
	} else if (tool == "scythe") {
		if (status == "empty") show_hint("Nothing to cut.");
		else show_hint("Not grown yet.");
	}
};

touch_plot = function(i) {
	var p = plots[i];
	var status = plot_status(p);
	if (tool == "") { show_hint("Pick a tool first."); return; }
	if (!can_use(tool, status)) { wrong_tool(status); return; }
	if (tool == "seeds") do_plant(i);
	else if (tool == "water") do_water(i);
	else if (tool == "scythe") do_harvest(i);
	save_game();
};

/// Rolls finished timers forward. Same free-offline-growth trick as the JS
/// build's settle(): the deadline was always correct, this just notices.
settle = function() {
	var changed = false;
	var now = date_current_datetime();
	for (var i = 0; i < plot_count; i++) {
		var p = plots[i];
		if (p.ready_at >= 0 && now >= p.ready_at) {
			p.stage += 1;
			p.ready_at = -1;
			changed = true;
		}
	}
	if (changed) save_game();
};

// -------------------------------------------------------------- save/load

save_path = "aerendell_field_save.json";

save_game = function() {
	var plots_arr = array_create(plot_count);
	for (var i = 0; i < plot_count; i++) {
		var p = plots[i];
		plots_arr[i] = {
			crop: p.crop, stage: p.stage,
			ready_at: p.ready_at, started_at: p.started_at,
		};
	}
	var bag_struct = {};
	var key = ds_map_find_first(bag);
	while (!is_undefined(key)) {
		variable_struct_set(bag_struct, key, bag[? key]);
		key = ds_map_find_next(bag, key);
	}
	var data = { farming_xp: farming_xp, plots: plots_arr, bag: bag_struct };
	var f = file_text_open_write(save_path);
	file_text_write_string(f, json_stringify(data));
	file_text_close(f);
};

load_game = function() {
	if (!file_exists(save_path)) return;
	var f = file_text_open_read(save_path);
	var str = "";
	while (!file_text_eof(f)) str += file_text_readln(f);
	file_text_close(f);
	if (string_length(str) == 0) return;
	var data = json_parse(str);
	if (is_undefined(data)) return;

	farming_xp = data[$ "farming_xp"] ?? 0;

	var loaded_bag = data[$ "bag"];
	if (!is_undefined(loaded_bag)) {
		ds_map_clear(bag);
		var names = variable_struct_get_names(loaded_bag);
		for (var i = 0; i < array_length(names); i++) {
			ds_map_add(bag, names[i], variable_struct_get(loaded_bag, names[i]));
		}
	}

	var loaded_plots = data[$ "plots"];
	if (!is_undefined(loaded_plots) && array_length(loaded_plots) == plot_count) {
		for (var i = 0; i < plot_count; i++) {
			var lp = loaded_plots[i];
			plots[i] = {
				crop: lp[$ "crop"] ?? "", stage: lp[$ "stage"] ?? 0,
				ready_at: lp[$ "ready_at"] ?? -1, started_at: lp[$ "started_at"] ?? -1,
			};
		}
	}
};

/// Recomputes every hit-test rectangle from the current GUI size. Called
/// every step (cheap) rather than once, so a window resize can't leave
/// stale rects behind.
layout = function() {
	var gw = display_get_gui_width();
	var gh = display_get_gui_height();
	var pad = gw * 0.045;

	plot_rects = [];
	var cols = 3, rows = 2;
	var grid_top = gh * 0.20;
	var grid_h = gh * 0.34;
	var cell_w = (gw - pad * 2 - pad * (cols - 1)) / cols;
	var cell_h = min((grid_h - pad * (rows - 1)) / rows, cell_w);
	for (var r = 0; r < rows; r++) {
	for (var c = 0; c < cols; c++) {
		var x1 = pad + c * (cell_w + pad);
		var y1 = grid_top + r * (cell_h + pad);
		array_push(plot_rects, { x1: x1, y1: y1, x2: x1 + cell_w, y2: y1 + cell_h });
	}
	}

	tool_rects = [];
	var names = ["seeds", "water", "scythe"];
	var labels = ["Seeds", "Watering Can", "Scythe"];
	var tb_y = gh * 0.86;
	var tb_h = gh * 0.075;
	var tb_w = (gw - pad * 2 - pad * 2) / 3;
	for (var t = 0; t < 3; t++) {
		var x1 = pad + t * (tb_w + pad);
		array_push(tool_rects, {
			x1: x1, y1: tb_y, x2: x1 + tb_w, y2: tb_y + tb_h,
			name: names[t], label: labels[t],
		});
	}

	seed_rects = [];
	var sp_top = gh * 0.20;
	var sp_h = gh * 0.11;
	for (var s = 0; s < array_length(crop_ids); s++) {
		var y1 = sp_top + s * (sp_h + pad * 0.6);
		array_push(seed_rects, {
			x1: pad, y1: y1, x2: gw - pad, y2: y1 + sp_h, id: crop_ids[s],
		});
	}
};

load_game();
settle();
layout();
