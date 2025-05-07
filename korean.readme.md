KubeJS - Create 모드 동적 레시피 정의 가이드 (data.json 참고용)


이 문서는 `kubejs/data/data.json` 파일에 Create 모드 레시피를 정의할 때
사용되는 필드와 그 의미를 설명합니다.

`data.json` 파일의 최상위 구조는 다음과 같은 단일 JSON 객체여야 합니다:
{
  "고유한_레시피_키_1": { ... 레시피 정의 객체 1 ... },
  "고유한_레시피_키_2": { ... 레시피 정의 객체 2 ... },
  ...
}

각 레시피 정의 객체는 다음 필드들을 가질 수 있습니다.

--------------------------------------------------------------------------------
공통 필드 (모든 레시피 타입에 적용 가능)
--------------------------------------------------------------------------------
id (String, 선택 사항):
  - KubeJS 레시피 ID를 지정합니다. (예: "kubejs:my_custom_recipe")
  - 지정하지 않으면 KubeJS가 자동으로 ID를 생성합니다.

type (String, 필수):
  - Create 모드의 레시피 타입을 지정합니다. (모두 소문자로)
  - 예: "mixing", "crushing", "compacting", "cutting", "deploying",
        "emptying", "filling", "haunting", "mechanical_crafting",
        "milling", "pressing", "sandpaper_polishing", "splashing"
        (Sequenced Assembly는 구조가 매우 복잡하여 별도 정의 필요)

output (String | Array | Object, 필수):
  - 레시피의 결과물입니다.
  - 단일 아이템: "minecraft:diamond"
  - 여러 아이템 (배열): ["minecraft:diamond", "minecraft:emerald"]
  - 확률 기반 아이템 (배열 내 객체):
    [{"item": "minecraft:diamond", "chance": 0.5}, "minecraft:coal"]
    (다이아몬드 50% 확률, 석탄 100% 확률로 각각 나옴)
  - 유체 결과물 (배열 내 객체, 해당 레시피 타입이 지원하는 경우):
    [{"fluid": "minecraft:water", "amount": 1000}, "minecraft:glass_bottle"]
    (amount는 mB 단위. KubeJS Create 통합이 문자열 "fluid:id:amount"도 인식할 수 있음)

input (String | Array | Object, 필수):
  - 레시피의 입력 재료입니다.
  - 단일 아이템/태그: "minecraft:coal_block" 또는 "#forge:cobblestone"
  - 여러 아이템/태그 (배열): ["minecraft:coal_block", "#forge:ores/iron"]
  - 유체 입력 (배열 내 객체, 해당 레시피 타입이 지원하는 경우):
    [{"fluid": "minecraft:lava", "amount": 500}, "minecraft:bucket"]

--------------------------------------------------------------------------------
레시피 타입별 추가 선택 필드
--------------------------------------------------------------------------------

1. Mixing (혼합) / Compacting (압축)
   - heated (Boolean, 선택 사항): 일반 가열(Blaze Burner) 필요 여부. (기본값: false)
   - superheated (Boolean, 선택 사항): 초고온 가열(Blaze Burner) 필요 여부. (기본값: false)
   - processingTime (Integer, 선택 사항, Mixing만 해당될 수 있음): 처리 시간 (틱 단위).

2. Crushing (분쇄) / Cutting (절단) / Milling (빻기/제분) / Pressing (압착)
   - processingTime (Integer, 선택 사항): 처리 시간 (틱 단위).

3. Deploying (설치/투입)
   - input (Array, 필수): 반드시 아이템 2개를 가진 배열이어야 합니다.
     형태: [ "대상_아이템_또는_태그", "Deployer가_들고있는_아이템_또는_태그" ]
   - keepHeldItem (Boolean, 선택 사항): Deployer가 들고 있는 아이템을 소모하지 않을지 여부. (기본값: false)

4. Emptying (비우기)
   - output (Array, 필수): 반드시 [유체, 빈 용기 아이템] 형태의 배열이어야 합니다.
     형태: [ {"fluid": "유체_ID", "amount": 양}, "빈_용기_아이템_ID" ]
   - input (String, 필수): 내용물이 채워진 용기 아이템 ID.

5. Filling (채우기)
   - output (String, 필수): 내용물이 채워진 용기 아이템 ID.
   - input (Array, 필수): 반드시 [유체, 빈 용기 아이템] 형태의 배열이어야 합니다.
     형태: [ {"fluid": "유체_ID", "amount": 양}, "빈_용기_아이템_ID" ]

6. Mechanical Crafting (기계 조합)
   - pattern (Array of Strings, 필수): 조합 패턴을 나타내는 문자열 배열 (최대 9x9).
     예: [ " S ", "SCS", " S " ]
   - keys (Object, 필수): 패턴의 각 문자에 해당하는 아이템/태그를 매핑하는 객체.
     예: { "S": "minecraft:stone", "C": "#forge:cobblestone" }

7. Haunting (빙의/유령화) / Sandpaper Polishing (사포 연마) / Splashing (물 뿌리기/세척)
   - 일반적으로 공통 필드 외 특별한 추가 조건은 적습니다.
   - Sandpaper Polishing의 경우, 플레이어가 `create:sandpaper` 태그가 있는 아이템을 들고 우클릭해야 합니다.

--------------------------------------------------------------------------------
예시 레시피 정의 (data.json 파일 내부)
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
참고:
- 아이템/유체 ID는 네임스페이스를 포함해야 합니다 (예: "minecraft:stone", "create:andesite_alloy").
- 태그는 `#`으로 시작합니다 (예: "#forge:ingots/copper").
- 확률 기반 아이템은 {"item": "아이템_ID", "chance": 0.0 ~ 1.0} 형태로 정의합니다.
- 유체는 {"fluid": "유체_ID", "amount": mB단위_양} 형태로 정의합니다.
- Boolean 값은 true 또는 false (따옴표 없이) 입니다.
- 숫자 값은 따옴표 없이 입력합니다.
================================================================================