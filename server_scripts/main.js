// (String, {item, count}, {item, chance}, {fluid, amount} 등 처리)
const parseOutputItem = (outputDef) => {
    // Handle simple string ID
    if (typeof outputDef === 'string' || outputDef instanceof String) {
        return Item.of(String(outputDef));
    }
    // Handle object definitions
    else if (typeof outputDef === 'object' && outputDef !== null) {
        // Item with chance?
        if (outputDef.item && outputDef.chance !== undefined) {
            let chance = parseFloat(outputDef.chance);
            if (isNaN(chance) || chance < 0 || chance > 1) {
                console.warn(`[DynamicRecipes] Invalid chance: ${outputDef.chance}. Defaulting to 1.0.`);
                chance = 1.0;
            }
            return Item.of(String(outputDef.item)).withChance(chance);
        }
        // Item with count?
        else if (outputDef.item && outputDef.count !== undefined) {
            let count = parseInt(outputDef.count);
            if (isNaN(count) || count <= 0) {
                console.warn(`[DynamicRecipes] Invalid count: ${outputDef.count}. Defaulting to 1.`);
                count = 1;
            }
            return Item.of(String(outputDef.item), count);
        }
        // Just item?
        else if (outputDef.item) {
            return Item.of(String(outputDef.item));
        }
        // Fluid?
        else if (outputDef.fluid && outputDef.amount !== undefined) {
            let amount = parseInt(outputDef.amount);
            if (isNaN(amount) || amount <= 0) {
                console.warn(`[DynamicRecipes] Invalid fluid amount: ${outputDef.amount}. Defaulting to 1000.`);
                amount = 1000;
            }
            return Fluid.of(String(outputDef.fluid), amount);
        }
        // Unparsable object format
        console.warn(`[DynamicRecipes] Cannot parse output object: ${JSON.stringify(outputDef)}`);
        return null;
    }
    // Invalid type
    console.warn(`[DynamicRecipes] Invalid output type: ${typeof outputDef}`);
    return null;
};


// --- Main Recipe Event Handler ---
ServerEvents.recipes(event => {

    // --- 1. Read data.json ---
    console.info('[DynamicRecipes] Reading kubejs/data/data.json...');
    let recipeDataFromFile; // Use let for potential reassignment in catch
    try {
        recipeDataFromFile = JsonIO.read('kubejs/data/data.json');
        console.info('[DynamicRecipes] JsonIO.read finished.');
        // Log basic info about the read data
        if (recipeDataFromFile === null) { console.warn('[DynamicRecipes] JsonIO.read returned null. Check file path/name/encoding.'); }
        else if (recipeDataFromFile === undefined) { console.warn('[DynamicRecipes] JsonIO.read returned undefined.'); }
        else { console.info('[DynamicRecipes] JsonIO.read result type: ' + typeof recipeDataFromFile); }
    } catch (e) {
        console.error('[DynamicRecipes] Error during JsonIO.read: ' + String(e));
        recipeDataFromFile = null; // Ensure it's null on error
    }

    // --- 2. Validate Loaded Data ---
    // Ensure data was loaded successfully and is a non-empty object
    if (recipeDataFromFile === null || recipeDataFromFile === undefined || typeof recipeDataFromFile !== 'object' || Object.keys(recipeDataFromFile).length === 0) {
        console.error('[DynamicRecipes] Failed to load data.json or it is not a non-empty object. No recipes will be added.');
        // Log details for debugging
        let errorMsg = '[DynamicRecipes] Validation Details:';
        errorMsg += `\n  - JsonIO.read returned: ${recipeDataFromFile === null ? 'null' : (recipeDataFromFile === undefined ? 'undefined' : 'a value')}`;
        errorMsg += `\n  - typeof recipeDataFromFile: ${typeof recipeDataFromFile}`;
        if (typeof recipeDataFromFile === 'object' && recipeDataFromFile !== null) {
            errorMsg += `\n  - Object.keys count: ${Object.keys(recipeDataFromFile).length}`;
        }
        console.error(errorMsg);
        return; // Stop processing if data is invalid
    }

    // --- 3. Process Recipe Definitions ---
    const recipesToProcess = Object.values(recipeDataFromFile); // Assuming JSON is an object of recipes
    console.info(`[DynamicRecipes] Loading ${recipesToProcess.length} recipe definitions from data.json object...`);

    recipesToProcess.forEach(recipeDef => {
        // --- 3a. Validate Individual Recipe Definition ---
        if (!recipeDef || typeof recipeDef !== 'object') {
            console.warn(`[DynamicRecipes] Skipping invalid recipe definition (not an object): ${JSON.stringify(recipeDef)}`);
            return; // Skip to next definition
        }

        // Validate required fields based on type
        let isValid = true;
        let missingFields = [];
        if (!recipeDef.type) { isValid = false; missingFields.push('type'); }
        if (!recipeDef.output) { isValid = false; missingFields.push('output'); }
        const recipeType = recipeDef.type ? String(recipeDef.type).toLowerCase() : null;

        if (!recipeType) { // Type itself is missing or invalid
            isValid = false;
        } else if (recipeType === 'mechanical_crafting') { // Special case for mechanical crafting
            if (!recipeDef.pattern) { isValid = false; missingFields.push('pattern'); }
            if (!recipeDef.keys) { isValid = false; missingFields.push('keys'); }
        } else { // Most other types require 'input'
            if (!recipeDef.input) { isValid = false; missingFields.push('input'); }
        }

        if (!isValid) {
            console.warn(`[DynamicRecipes] Skipping recipe (ID: ${recipeDef.id || 'N/A'}) due to missing fields: ${missingFields.join(', ')}`);
            return; // Skip to next definition
        }

        // --- 3b. Parse Output ---
        let parsedOutput;
        try {
            if (Array.isArray(recipeDef.output)) {
                parsedOutput = recipeDef.output.map(parseOutputItem).filter(item => item !== null);
                if (parsedOutput.length === 0) throw new Error("No valid outputs after parsing array.");
            } else {
                parsedOutput = parseOutputItem(recipeDef.output);
                if (!parsedOutput) throw new Error("No valid output after parsing definition.");
            }
        } catch (outputParseError) {
            console.error(`[DynamicRecipes] Error parsing output (ID: ${recipeDef.id || 'N/A'}): ${outputParseError}\nOutput Def: ${JSON.stringify(recipeDef.output)}`);
            return; // Skip to next definition
        }

        // --- 3c. Create Recipe ---
        let recipe; // Holds the created recipe object
        try {
            switch (recipeType) {
                case 'mixing':
                    recipe = event.recipes.create.mixing(parsedOutput, recipeDef.input);
                    if (recipeDef.heated) recipe.heated();
                    if (recipeDef.superheated) recipe.superheated();
                    if (recipeDef.processingTime) recipe.processingTime(recipeDef.processingTime);
                    break;
                case 'crushing':
                    recipe = event.recipes.create.crushing(parsedOutput, recipeDef.input);
                    if (recipeDef.processingTime) recipe.processingTime(recipeDef.processingTime);
                    break;
                case 'compacting':
                    recipe = event.recipes.create.compacting(parsedOutput, recipeDef.input);
                    if (recipeDef.heated) recipe.heated();
                    if (recipeDef.superheated) recipe.superheated();
                    break;
                case 'cutting':
                    recipe = event.recipes.create.cutting(parsedOutput, recipeDef.input);
                    if (recipeDef.processingTime) recipe.processingTime(recipeDef.processingTime);
                    break;
                case 'deploying':
                    if (!Array.isArray(recipeDef.input) || recipeDef.input.length !== 2) { console.warn(`[DR] Invalid input for deploying (ID: ${recipeDef.id||'N/A'}). Skip.`); return; }
                    recipe = event.recipes.create.deploying(parsedOutput, recipeDef.input);
                    if (recipeDef.keepHeldItem) recipe.keepHeldItem();
                    break;
                case 'emptying':
                    if (!Array.isArray(parsedOutput) || parsedOutput.length !== 2) { console.warn(`[DR] Invalid output for emptying (ID: ${recipeDef.id||'N/A'}). Skip.`); return; }
                    recipe = event.recipes.create.emptying(parsedOutput, recipeDef.input);
                    break;
                case 'filling':
                    if (!Array.isArray(recipeDef.input) || recipeDef.input.length !== 2) { console.warn(`[DR] Invalid input for filling (ID: ${recipeDef.id||'N/A'}). Skip.`); return; }
                    recipe = event.recipes.create.filling(parsedOutput, recipeDef.input);
                    break;
                case 'haunting':
                    recipe = event.recipes.create.haunting(parsedOutput, recipeDef.input);
                    break;
                case 'mechanical_crafting':
                    recipe = event.recipes.create.mechanical_crafting(parsedOutput, recipeDef.pattern, recipeDef.keys);
                    break;
                case 'milling':
                    recipe = event.recipes.create.milling(parsedOutput, recipeDef.input);
                    if (recipeDef.processingTime) recipe.processingTime(recipeDef.processingTime);
                    break;
                case 'pressing':
                    let pressingInput = Array.isArray(recipeDef.input) ? recipeDef.input[0] : recipeDef.input;
                    if (Array.isArray(recipeDef.input)) { console.warn(`[DR] Pressing expects single input, using first (ID: ${recipeDef.id||'N/A'}).`); }
                    recipe = event.recipes.create.pressing(parsedOutput, pressingInput);
                    if (recipeDef.processingTime) recipe.processingTime(recipeDef.processingTime);
                    break;
                case 'sandpaper_polishing':
                    recipe = event.recipes.create.sandpaper_polishing(parsedOutput, recipeDef.input);
                    break;
                case 'splashing':
                    recipe = event.recipes.create.splashing(parsedOutput, recipeDef.input);
                    break;
                default:
                    console.warn(`[DynamicRecipes] Unknown Create recipe type '${recipeDef.type}' (ID: ${recipeDef.id || 'N/A'}). Skipping.`);
                    return; // Skip unknown types
            }

            // --- 3d. Set ID and Log Success ---
            if (recipe && recipeDef.id) {
                recipe.id(String(recipeDef.id));
                console.info(`[DynamicRecipes] Added Create recipe: ${recipeDef.id}`);
            } else if (recipe) {
                // Log basic info even if ID was auto-generated
                let inputDesc = recipeDef.input ? (Array.isArray(recipeDef.input) ? recipeDef.input.join(', ') : recipeDef.input) : 'pattern/keys';
                let outputDesc = '[...]'; // Keep log simple
                try { outputDesc = JSON.stringify(recipeDef.output); } catch (err) {/* ignore */}
                console.info(`[DynamicRecipes] Added Create recipe (auto-ID): type '${recipeType}', output(s) '${outputDesc}', input(s) '${inputDesc}'`);
            }

        } catch (recipeCreationError) {
            console.error(`[DynamicRecipes] Error creating recipe (ID: ${recipeDef.id || 'N/A'}): ${String(recipeCreationError)}\nDefinition: ${JSON.stringify(recipeDef)}`);
        }
    }); // end recipesToProcess.forEach

    console.info(`[DynamicRecipes] Finished processing ${recipesToProcess.length} recipe definitions.`);
}); // end ServerEvents.recipes
