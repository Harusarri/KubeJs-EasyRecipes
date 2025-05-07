KubeJS - Dynamic Create Mod Recipe Definition Guide (for data.json)


This document explains the fields used to define Create mod recipes
within the `kubejs/data/data.json` file and their meanings.

The top-level structure of the `data.json` file must be a single JSON Object:
{
  "unique_recipe_key_1": { ... Recipe Definition Object 1 ... },
  "unique_recipe_key_2": { ... Recipe Definition Object 2 ... },
  ...
}

Each Recipe Definition Object can contain the following fields.

--------------------------------------------------------------------------------
Common Fields (Applicable to most recipe types)
--------------------------------------------------------------------------------
id (String, Optional):
  - Specifies the KubeJS recipe ID (e.g., "kubejs:my_custom_recipe").
  - If omitted, KubeJS will generate an ID automatically.

type (String, Required):
  - Specifies the Create mod recipe type (all lowercase).
  - Examples: "mixing", "crushing", "compacting", "cutting", "deploying",
        "emptying", "filling", "haunting", "mechanical_crafting",
        "milling", "pressing", "sandpaper_polishing", "splashing"
        (Sequenced Assembly has a complex structure and needs separate definition)

output (String | Array | Object, Required):
  - The result(s) of the recipe.
  - Single Item: "minecraft:diamond"
  - Multiple Items (Array): ["minecraft:diamond", "minecraft:emerald"]
  - Item with Chance (Object in Array):
    [{"item": "minecraft:diamond", "chance": 0.5}, "minecraft:coal"]
    (50% chance for diamond, 100% chance for coal, output individually)
  - Fluid Output (Object in Array, if supported):
    [{"fluid": "minecraft:water", "amount": 1000}, "minecraft:glass_bottle"]
    (amount is in mB. KubeJS Create integration might also recognize "fluid:id:amount" strings)

input (String | Array | Object, Required for most types):
  - The ingredient(s) required for the recipe.
  - Single Item/Tag: "minecraft:coal_block" or "#forge:cobblestone"
  - Multiple Items/Tags (Array): ["minecraft:coal_block", "#forge:ores/iron"]
  - Fluid Input (Object in Array, if supported):
    [{"fluid": "minecraft:lava", "amount": 500}, "minecraft:bucket"]

--------------------------------------------------------------------------------
Type-Specific Optional Fields
--------------------------------------------------------------------------------

1. Mixing / Compacting
   - heated (Boolean, Optional):
     - If set to `true`, the recipe requires the Basin to be heated by a Blaze Burner (consuming Blaze Cakes or other fuel).
     - Standard heat level. Cannot be true if `superheated` is true.
     - Defaults to `false`.
   - superheated (Boolean, Optional):
     - If set to `true`, the recipe requires the Basin to be super-heated by a Blaze Burner fed with Blaze Cakes.
     - Highest heat level. Cannot be true if `heated` is true.
     - Defaults to `false`.
   - processingTime (Integer, Optional, mainly for `mixing`): Processing time in ticks.

2. Crushing / Cutting / Milling / Pressing
   - processingTime (Integer, Optional): Processing time in ticks.

3. Deploying
   - input (Array, Required): Must be an array of two items:
     Format: [ "target_item_or_tag", "item_or_tag_held_by_deployer" ]
   - keepHeldItem (Boolean, Optional): If `true`, the item held by the Deployer is not consumed. (Defaults to `false`)

4. Emptying
   - output (Array, Required): Must be an array of two elements: [ Fluid, Empty Container Item ]
     Format: [ {"fluid": "fluid_id", "amount": mB_amount}, "empty_container_item_id" ]
   - input (String, Required): The filled container item ID.

5. Filling
   - output (String, Required): The filled container item ID.
   - input (Array, Required): Must be an array of two elements: [ Fluid, Empty Container Item ]
     Format: [ {"fluid": "fluid_id", "amount": mB_amount}, "empty_container_item_id" ]

6. Mechanical Crafting
   - pattern (Array of Strings, Required): Defines the crafting shape (max 9x9).
     Example: [ " S ", "SCS", " S " ]
   - keys (Object, Required): Maps characters in the pattern to item/tag IDs.
     Example: { "S": "minecraft:stone", "C": "#forge:cobblestone" }
   - Note: Does not use the `input` field.

7. Haunting / Sandpaper Polishing / Splashing
   - Generally only require the common fields besides specific mechanics.
   - Sandpaper Polishing requires the player to right-click with an item tagged `create:sandpaper`.
   - Haunting requires items to pass over Soul Fire using an Encased Fan.
   - Splashing requires items to pass through water using an Encased Fan.

--------------------------------------------------------------------------------
Example Recipe Definitions (inside data.json file)
--------------------------------------------------------------------------------
{
  "superheated_diamond_mix": {
    "id": "kubejs:super_diamond_from_mix",
    "type": "mixing",
    "output": "minecraft:diamond",
    "input": ["minecraft:coal_block", "minecraft:magma_block"],
    "superheated": true
  },
  "cobble_to_gravel_and_flint": {
    "type": "crushing",
    "output": ["minecraft:gravel", {"item": "minecraft:flint", "chance": 0.25}],
    "input": "minecraft:cobblestone",
    "processingTime": 100
  }
}

--------------------------------------------------------------------------------
Notes:
- Item/Fluid IDs must include the namespace (e.g., "minecraft:stone", "create:andesite_alloy").
- Tags start with `#` (e.g., "#forge:ingots/copper").
- Item with chance is defined as {"item": "item_id", "chance": 0.0 to 1.0}.
- Fluid is defined as {"fluid": "fluid_id", "amount": amount_in_mB}.
- Boolean values are `true` or `false` (without quotes).
- Numeric values are entered without quotes.
================================================================================