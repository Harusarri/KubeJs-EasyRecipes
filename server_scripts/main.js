// kubejs/server_scripts/main.js (또는 dynamic_create_recipes.js 등)
// Create 모드 레시피를 data.json 파일에서 동적으로 로드하는 스크립트
// 버전: Chance 처리 로직 포함됨, catch 문법 오류 수정됨

// --- 헬퍼 함수: JSON output 정의를 KubeJS 아이템/유체 객체로 변환 ---
// 이 함수는 ServerEvents.recipes 바깥쪽에 두는 것이 좋습니다.
const parseOutputItem = (outputDef) => {
  // --- 수정: 입력값이 문자열 '처럼' 보이지만 실제로는 아닐 경우를 대비해 String()으로 감싸기 ---
  if (typeof outputDef === 'string' || outputDef instanceof String) {
    // 단순 아이템 ID 문자열 (예: "minecraft:diamond")
    // String()으로 감싸서 확실하게 primitive string으로 만듭니다.
    return Item.of(String(outputDef));
  } else if (typeof outputDef === 'object' && outputDef !== null) {
    // --- 이하 로직은 이전과 동일 ---
    if (outputDef.item && outputDef.chance !== undefined) {
      // 확률 객체
      let chance = parseFloat(outputDef.chance);
      if (isNaN(chance) || chance < 0 || chance > 1) {
        console.warn(`[DynamicCreateRecipes] Invalid chance value (${outputDef.chance}) for item ${outputDef.item}. Defaulting to 1.0 (100%).`);
        chance = 1.0;
      }
      return Item.of(String(outputDef.item)).withChance(chance); // item 값도 String() 처리
    } else if (outputDef.item && outputDef.count !== undefined) {
      // 수량 객체
      let count = parseInt(outputDef.count);
      if (isNaN(count) || count <= 0) {
        console.warn(`[DynamicCreateRecipes] Invalid count value (${outputDef.count}) for item ${outputDef.item}. Defaulting to 1.`);
        count = 1;
      }
      return Item.of(String(outputDef.item), count); // item 값도 String() 처리
    } else if (outputDef.item) {
        // 아이템 ID만 있는 객체
        return Item.of(String(outputDef.item)); // item 값도 String() 처리
    } else if (outputDef.fluid && outputDef.amount !== undefined) {
      // 유체 객체
      let amount = parseInt(outputDef.amount);
      if (isNaN(amount) || amount <= 0) {
          console.warn(`[DynamicCreateRecipes] Invalid fluid amount value (${outputDef.amount}) for fluid ${outputDef.fluid}. Defaulting to 1000.`);
          amount = 1000;
      }
      return Fluid.of(String(outputDef.fluid), amount); // fluid 값도 String() 처리
    }
    console.warn(`[DynamicCreateRecipes] Could not parse output object definition: ${JSON.stringify(outputDef)}`);
    return null;
  }
  // --- 수정: 이상한 배열 형태가 들어오는 경우에 대한 처리 추가 ---
  // 만약 outputDef가 문자열도, 객체도 아닌 이상한 배열이라면 여기서 걸립니다.
  // 로그에는 이미 기록되었으므로 추가 로그 없이 null 반환
  // console.warn(`[DynamicCreateRecipes] Invalid output definition type: ${typeof outputDef}. Value: ${JSON.stringify(outputDef)}`);
  return null;
};


// --- 메인 레시피 이벤트 핸들러 ---
ServerEvents.recipes(event => {
  console.info('[DynamicCreateRecipes] Attempting to read kubejs/data/data.json...');
  let recipeDataFromFile;

  try {
      recipeDataFromFile = JsonIO.read('kubejs/data/data.json');
      console.info('[DynamicCreateRecipes] JsonIO.read execution finished.');

      if (recipeDataFromFile === null) {
          console.warn('[DynamicCreateRecipes] JsonIO.read returned null. Check file path, name, and encoding (UTF-8).');
      } else if (recipeDataFromFile === undefined) {
          console.warn('[DynamicCreateRecipes] JsonIO.read returned undefined. This is unusual.');
      } else {
          console.info('[DynamicCreateRecipes] JsonIO.read result type: ' + typeof recipeDataFromFile);
      }
  } catch (e) {
      console.error('[DynamicCreateRecipes] Error during JsonIO.read: ' + String(e));
      recipeDataFromFile = null;
  }

  // 파일 읽기 실패 또는 데이터가 객체가 아니거나 비어있는 경우 오류 출력 후 종료
  if (recipeDataFromFile === null || recipeDataFromFile === undefined || typeof recipeDataFromFile !== 'object' || Object.keys(recipeDataFromFile).length === 0) {
    let errorMsg = '[DynamicCreateRecipes] Failed to load or parse kubejs/data/data.json, or it is not a non-empty object.';
    errorMsg += `\n  - JsonIO.read actually returned: ${recipeDataFromFile === null ? 'null' : (recipeDataFromFile === undefined ? 'undefined' : 'a value')}`;
    errorMsg += `\n  - typeof recipeDataFromFile: ${typeof recipeDataFromFile}`;
    if (typeof recipeDataFromFile === 'object' && recipeDataFromFile !== null) {
        errorMsg += `\n  - Object.keys(recipeDataFromFile).length: ${Object.keys(recipeDataFromFile).length}`;
    }
    console.error(errorMsg);
    return; // 스크립트 실행 중단
  }

  // 객체의 값들을 배열로 변환하여 사용 (JSON이 객체 형태라고 가정)
  const recipesToProcess = Object.values(recipeDataFromFile);
  console.info(`[DynamicCreateRecipes] Successfully loaded ${recipesToProcess.length} recipe definitions from data.json object.`);

  // 각 레시피 정의를 순회하며 처리
  recipesToProcess.forEach(recipeDef => {
    // recipeDef 유효성 검사
    if (!recipeDef || typeof recipeDef !== 'object') {
        console.warn(`[DynamicCreateRecipes] Skipping invalid recipe definition: ${JSON.stringify(recipeDef)}`);
        return; // 다음 레시피로
    }

    // 필수 필드 확인 로직 (mechanical_crafting 분기 처리 포함)
    let isValid = true;
    let missingFields = [];
    if (!recipeDef.type) { isValid = false; missingFields.push('type'); }
    if (!recipeDef.output) { isValid = false; missingFields.push('output'); }
    const recipeType = recipeDef.type ? String(recipeDef.type).toLowerCase() : null;
    if (recipeType === 'mechanical_crafting') {
        if (!recipeDef.pattern) { isValid = false; missingFields.push('pattern'); }
        if (!recipeDef.keys) { isValid = false; missingFields.push('keys'); }
    } else if (recipeType) {
        if (!recipeDef.input) { isValid = false; missingFields.push('input'); }
    } else {
        isValid = false;
    }

    if (!isValid) {
      console.warn(`[DynamicCreateRecipes] Skipping recipe due to missing fields (${missingFields.join(', ')}): ${recipeDef.id || JSON.stringify(recipeDef)}`);
      return; // 다음 레시피로
    }

    // --- ★★★★★ Output 파싱 ★★★★★ ---
    let parsedOutput;
    try {
        if (Array.isArray(recipeDef.output)) {
          // Output이 배열일 경우, 각 요소를 파싱하고 null이 아닌 것만 필터링
          parsedOutput = recipeDef.output.map(outDef => parseOutputItem(outDef)).filter(item => item !== null);
          // 유효한 파싱 결과가 하나도 없으면 에러 처리
          if (parsedOutput.length === 0) throw new Error("No valid outputs after parsing the array.");
        } else {
          // Output이 단일 항목일 경우 파싱
          parsedOutput = parseOutputItem(recipeDef.output);
          // 파싱 결과가 유효하지 않으면 에러 처리
          if (!parsedOutput) throw new Error("No valid output after parsing the single definition.");
        }
    } catch (outputParseError) {
        console.error(`[DynamicCreateRecipes] Error parsing output for recipe (ID: ${recipeDef.id || 'N/A'}): ${String(outputParseError)}\nOutput Definition: ${JSON.stringify(recipeDef.output)}`);
        return; // 다음 레시피로
    }
    // --- Output 파싱 끝 ---


    // --- 레시피 생성 ---
    let recipe;
    try {
        // ★★★★★ 파싱된 parsedOutput 변수를 사용 ★★★★★
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
              if (!Array.isArray(recipeDef.input) || recipeDef.input.length !== 2) { /* ... */ return; }
              recipe = event.recipes.create.deploying(parsedOutput, recipeDef.input);
              if (recipeDef.keepHeldItem) recipe.keepHeldItem();
              break;
            case 'emptying':
               if (!Array.isArray(parsedOutput) || parsedOutput.length !== 2) { /* ... */ return; }
               recipe = event.recipes.create.emptying(parsedOutput, recipeDef.input);
               break;
            case 'filling':
              if (!Array.isArray(recipeDef.input) || recipeDef.input.length !== 2) { /* ... */ return; }
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
               if (Array.isArray(recipeDef.input)) { /* ... */ recipe = event.recipes.create.pressing(parsedOutput, recipeDef.input[0]); }
               else { recipe = event.recipes.create.pressing(parsedOutput, recipeDef.input); }
               if (recipeDef.processingTime) recipe.processingTime(recipeDef.processingTime);
               break;
            case 'sandpaper_polishing':
              recipe = event.recipes.create.sandpaper_polishing(parsedOutput, recipeDef.input);
              break;
            case 'splashing':
              recipe = event.recipes.create.splashing(parsedOutput, recipeDef.input);
              break;
            default:
              console.warn(`[DynamicCreateRecipes] Unknown Create recipe type '${recipeDef.type}' for recipe: ${recipeDef.id || JSON.stringify(recipeDef)}`);
              return;
        }

        // 레시피 ID 설정 및 성공 로그
        if (recipe && recipeDef.id) {
          recipe.id(String(recipeDef.id));
          console.info(`[DynamicCreateRecipes] Added Create recipe: ${recipeDef.id}`);
        } else if (recipe) {
          let inputDesc = recipeDef.input ? (Array.isArray(recipeDef.input) ? recipeDef.input.join(', ') : recipeDef.input) : 'N/A (Mech Crafting)';
          let outputDesc;
           try {
             outputDesc = JSON.stringify(recipeDef.output); // 로그에는 원본 JSON 형태를 보여줌
           } catch (err) {
             console.warn(`[DynamicCreateRecipes] Failed to stringify output for logging (ID: ${recipeDef.id || 'N/A'}): ${String(err)}`);
             outputDesc = '[Parsing Error]';
           }
          console.info(`[DynamicCreateRecipes] Added Create recipe (auto-generated ID): type '${recipeDef.type}', output(s) '${outputDesc}' from input(s) '${inputDesc}'`);
        }
    } catch (recipeCreationError) {
        console.error(`[DynamicCreateRecipes] Error creating recipe for definition (ID: ${recipeDef.id || 'N/A'}): ${String(recipeCreationError)}\nRecipe Definition: ${JSON.stringify(recipeDef)}`);
    }
  }); // end of recipesToProcess.forEach
}); // end of ServerEvents.recipes