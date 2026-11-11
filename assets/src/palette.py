"""The fixed 32-colour palette of High Tides ("Fari 32")."""

# name, hex, group
COLOURS = [
    ("ink", "#1a1423", "neutral"),
    ("abyss", "#232a4d", "sea"),
    ("deep", "#2f4a73", "sea"),
    ("sea", "#3f7396", "sea"),
    ("mist", "#7fb0c4", "sea"),
    ("foam", "#c9e4e3", "sea"),
    ("white", "#f6f3e4", "neutral"),
    ("slate", "#3d3a4f", "neutral"),
    ("stone", "#666479", "neutral"),
    ("ash", "#9b9aa6", "neutral"),
    ("soot", "#4a2030", "forge"),
    ("rust", "#8f3b2e", "forge"),
    ("ember", "#d95a2b", "forge"),
    ("flame", "#f29a2e", "forge"),
    ("glow", "#fbd35a", "forge"),
    ("copper", "#b5683f", "forge"),
    ("kelp_dark", "#1f4a3c", "sprout"),
    ("kelp", "#2f7a4f", "sprout"),
    ("moss", "#6aa84a", "sprout"),
    ("sprout", "#b5d665", "sprout"),
    ("coral", "#e8766a", "sprout"),
    ("verd_dark", "#2a6b6a", "verdigris"),
    ("verd", "#4fa89a", "verdigris"),
    ("verd_light", "#9bd6bd", "verdigris"),
    ("wood_dark", "#4e3528", "earth"),
    ("wood", "#7d5236", "earth"),
    ("tan", "#b98a5a", "earth"),
    ("sand", "#e3c48c", "earth"),
    ("dusk", "#4b3766", "dusk"),
    ("violet", "#7b5aa6", "dusk"),
    ("lilac", "#b99bd6", "dusk"),
    ("coral_dark", "#a83f5a", "sprout"),
]

assert len(COLOURS) == 32
PALETTE = {name: hexa for name, hexa, _ in COLOURS}
RGB = {name: tuple(int(hexa[i : i + 2], 16) for i in (1, 3, 5)) for name, hexa, _ in COLOURS}

FACTION_COLOURS = {
    "forge": ["soot", "rust", "ember", "flame", "glow"],
    "sprout": ["kelp_dark", "kelp", "moss", "sprout", "coral"],
    "neutral": ["slate", "stone", "ash", "sand", "white"],
    "abyss": ["abyss", "deep", "sea", "mist", "foam"],
    "gear": ["wood_dark", "wood", "copper", "tan", "sand"],
    "vesper": ["dusk", "violet", "lilac", "glow", "white"],
}
