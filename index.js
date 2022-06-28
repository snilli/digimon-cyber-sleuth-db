import cheerio from "cheerio";
import got from "got";
import fs from "fs";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const getHtmlPath = (id, name) => {
  return `digimon/${id}-${name}.html`;
};

const writeFile = (name, content) => {
  fs.writeFileSync(name, content, { encoding: "utf-8", flag: "as" });
};

const readFile = (name) => {
  return fs.readFileSync(name, { encoding: "utf-8" });
};

const existFile = (name) => {
  return fs.existsSync(name);
};

const getDigimonList = async () => {
  const data = {};
  const response = readFile("digimon-list.html");
  const $ = cheerio.load(response);
  const [tableBody] = $("#digiList > tbody");
  for (const [key, tdEle] of Object.entries(tableBody.children)) {
    data[key] = {
      id: key,
      no: $(tdEle.children[0]).text().trim(),
      name: tdEle.children[1].children[3].children[0].data.trim(),
      iconHref: tdEle.children[1].children[1].attribs.src,
      detailHref: tdEle.children[1].children[3].attribs.href,
      stage: $(tdEle.children[2]).text().trim().toLowerCase(),
      type: $(tdEle.children[3]).text().trim().toLowerCase(),
      attribute: $(tdEle.children[4]).text().trim().toLowerCase(),
      memory: parseInt($(tdEle.children[5]).text().trim()),
      equipSlot: parseInt($(tdEle.children[6]).text().trim()),
      hp: parseInt($(tdEle.children[7]).text().trim()),
      sp: parseInt($(tdEle.children[8]).text().trim()),
      atk: parseInt($(tdEle.children[9]).text().trim()),
      def: parseInt($(tdEle.children[10]).text().trim()),
      int: parseInt($(tdEle.children[11]).text().trim()),
      spd: parseInt($(tdEle.children[12]).text().trim()),
    };
  }

  writeFile("digimon-list.json", JSON.stringify(data));
};

const getAndWrite = async (url, path) => {
  let i = 0;

  const alreadyWrite = existFile(path);
  if (alreadyWrite && readFile(path)) {
    return;
  }

  while (true) {
    if (i > 10) {
      console.log({ url, path });
      break;
    }
    try {
      const response = await got.get(url);
      if (response.statusCode !== 200) {
        throw new Error("not found");
      }
      writeFile(path, response.body);
      break;
    } catch (e) {
      await sleep(2000);
      i += 1;
    }
  }
};

const getDigimonDetailHtml = async () => {
  const src = JSON.parse(readFile("digimon-list.json"));
  const promise = [];
  try {
    for (const [key, digimon] of Object.entries(src)) {
      promise.push(
        getAndWrite(
          digimon.detailHref,
          `digimon/${digimon.id.padStart(3, "0")}-${digimon.name}.html`
        )
      );
    }
    Promise.all(promise);
  } catch (e) {
    console.log(e);
  }
};

const getImgName = (no, name) =>
  `${no.padStart(3, "0")}-${name.toLowerCase()}`
    .replace(/(\s)/g, "_")
    .replace(".", "");

const getDigimonDb = async () => {
  const path = "digimon-db.json";
  const alreadyWrite = existFile(path);
  if (alreadyWrite && readFile(path)) {
    return;
  }

  const regName = /^#(\d+)\s([\w\s\(\)\.\-]+)/g;
  const regRequirement = /(?![Requires])([\w]+): ([\d\w\s\-]+)/g;
  const data = {};
  const [, ...listFile] = fs.readdirSync("digimon");
  const moveList = JSON.parse(fs.readFileSync("move_list.json"));

  const moveMap = new Map();
  for (const [, move] of Object.entries(moveList)) {
    moveMap.set(move.id, move);
  }

  const abilityList = JSON.parse(fs.readFileSync("ability_list.json"));
  const abilityMap = new Map();
  for (const [, ability] of Object.entries(abilityList)) {
    abilityMap.set(ability.name, ability);
  }
  for (const file of listFile) {
    const html = readFile("digimon/" + file);
    const $ = cheerio.load(html);

    const [tableInfo, tableEvoFrom, tableEvoInto, tableMove, tableStat] =
      $("tbody");
    const [_, info, type, memory, attribute, equipSlot, supportSkill] = $(
      tableInfo
    ).find($("td"));
    const title = $(info).find($("td.digiheader > span > b")).text();
    const [, no, name] = [...title.matchAll(regName)][0];

    const digimomNo = parseInt(no);
    const fileName = getImgName(no, name);
    const abilityName = $($(supportSkill).children()[0])
      .text()
      .split(":")[1]
      .trim();

    const digimon = {
      id: digimomNo.toString(),
      no: digimomNo,
      name: name,
      img: `img-${fileName}.png`,
      icon: `icon-${fileName}.png`,
      type: $(type).text().split(":")[1].trim(),
      stage: info.children[3].data ?? info.children[4].data,
      memory: parseInt($(memory).text().split(":")[1]),
      attribute: $(attribute).text().split(":")[1].trim(),
      equipSlot: parseInt($(equipSlot).text().split(":")[1]),
      ability: abilityMap.get(abilityName),
      evoFrom: {},
      evoInto: {},
      move: {},
      stat: {},
    };

    $(tableEvoFrom)
      .find("tr")
      .each((trIdx, trElem) => {
        if (!trIdx) {
          return;
        }
        $(trElem)
          .find("td")
          .children()
          .each((tdIdx, tdElem) => {
            const name = $(tdElem).text();
            const id = (
              listFile.findIndex((file) => file.includes(name)) + 1
            ).toString();
            const fileName = getImgName(id, name);
            digimon.evoFrom[id] = {
              id,
              name,
              icon: `icon-${fileName}.png`,
              img: `img-${fileName}.png`,
            };
          });
      });

    $(tableEvoInto)
      .find("tr")
      .each((trIdx, trElem) => {
        if (!trIdx) {
          return;
        }
        if ($(trElem).text() === "N/A") {
          return;
        }

        const [digimonTd, lvlTd, requiresTd] = $(trElem).find("td");
        const name = $(digimonTd).text();
        const id = (
          listFile.findIndex((file) => file.includes(name)) + 1
        ).toString();
        const fileName = getImgName(id, name);
        digimon.evoInto[id] = {
          id,
          name,
          icon: `icon-${fileName}.png`,
          img: `img-${fileName}.png`,
          lvl: parseInt($(lvlTd).text().split(":")[1].trim()),
        };
        const description = $(requiresTd).text();
        digimon.evoInto[id]["description"] = description;

        if (description.includes("Mode Change")) {
          digimon.evoInto[id]["changeMode"] = true;
        }
        if (description.includes("Cleared")) {
          digimon.evoInto[id]["hackerCleared"] = true;
        }
        if (description.includes("DLC Required")) {
          digimon.evoInto[id]["dlc"] = true;
        }

        for (const [, key, value] of description.matchAll(regRequirement)) {
          const attr = key.toLowerCase();
          if (attr === "item") {
            digimon.evoInto[id][attr] = value;
            continue;
          }
          if (attr === "digimon") {
            const attrId = (
              listFile.findIndex((file) => file.includes(value)) + 1
            ).toString();
            const fileName = getImgName(attrId, value);
            digimon.evoInto[id]["jogress"] = {};
            digimon.evoInto[id]["jogress"][attrId] = {
              id: attrId,
              icon: `icon-${fileName}.png`,
              img: `img-${fileName}.png`,
            };
            continue;
          }
          digimon.evoInto[id][attr] = parseInt(value);
        }
      });

    $(tableMove)
      .find("tr")
      .each((trIdx, trElem) => {
        if (!trIdx) {
          return;
        }

        if (trIdx % 2 === 0) {
          return;
        }

        const [lvlTd, nameTd, spTd, typeTd, powerTd, attributeTd, inheritTd] =
          $(trElem).find("td");
        const name = $(nameTd).text().trim();
        const [a] = $(nameTd).find('a')
        const href = a.attribs.href
        const [,ids] = href.split('=')
        const move = moveMap.get(ids)
        const id = move.id.toString();

        digimon.move[id] = {
          id,
          lvl: parseInt($(lvlTd).text().trim()),
          name,
          sp: parseInt($(spTd).text().trim()),
          type: $(typeTd).text().trim(),
          power: parseInt($(powerTd).text().trim()),
          attribute:
            $(attributeTd).text().trim() !== "Thunder"
              ? $(attributeTd).text().trim()
              : "Electric",
          inherit: $(inheritTd).text().trim() === "Yes",
          description: $($(trElem).next()).text().includes("Thunder")
            ? $($(trElem).next()).text().replace("Thunder", "Electric")
            : $($(trElem).next()).text(),
        };
      });

    $(tableStat)
      .find("tr")
      .each((idx, elem) => {
        if (!idx) {
          return;
        }
        const [lvl, hp, sp, atk, def, int, spd] = $($(elem).find("td"));
        const id = parseInt($(lvl).text().split(" ")[1]);
        digimon.stat[id] = {
          lvl: id,
          hp: parseInt($(hp).text()),
          sp: parseInt($(sp).text()),
          atk: parseInt($(atk).text()),
          def: parseInt($(def).text()),
          int: parseInt($(int).text()),
          spd: parseInt($(spd).text()),
        };
      });
    if (Object.keys(digimon.evoFrom) == 0) {
      digimon.evoFrom = undefined;
    }
    if (Object.keys(digimon.evoInto) == 0) {
      digimon.evoInto = undefined;
    }
    data[digimon.id] = digimon;
  }

  writeFile(path, JSON.stringify(data));
};

const getMoveDb = async () => {
  const path = "move-db.json";
  const alreadyWrite = existFile(path);
  if (alreadyWrite && readFile(path)) {
    return;
  }
  const data = {};
  const digimonDb = JSON.parse(fs.readFileSync("digimon-db.json"));
  const moveList = JSON.parse(fs.readFileSync("move_list.json"));
  const digimonMap = new Map();
  const moveMap = new Map();
  for (const [, digimon] of Object.entries(digimonDb)) {
    digimonMap.set(digimon.id, digimon);
  }
  for (const [, move] of Object.entries(moveList)) {
    moveMap.set(move.id, {
      id: move.id,
      name: move.name,
      sp: move.sp,
      type: move.type,
      power: move.power,
      attribute: move.attribute.replace("Thunder", "Electric"),
      inheritable: move.inheritable,
      description: move.description.replace("Thunder", "Electric"),
      digimon: {},
    });
  }

  for (const [digimonId, digimon] of digimonMap) {
    for (const [moveId, digimonMove] of Object.entries(digimon.move)) {
      const move = moveMap.get(moveId);
      move.digimon[digimonId] = {
        id: digimon.id,
        lvl: digimonMove.lvl,
        name: digimon.name,
        icon: digimon.icon,
        img: digimon.img,
      };
    }
  }

  for (const [moveId, move] of moveMap) {
    if (!Object.keys(move.digimon).length) {
      console.log(moveId)
      console.log(move.name)
      continue
    }

    data[moveId] = move;
  }

  writeFile(path, JSON.stringify(data));
};

const getAbilityDb = async () => {
  const path = "ability-db.json";
  const alreadyWrite = existFile(path);
  if (alreadyWrite && readFile(path)) {
    return;
  }
  const data = {};
  const digimonDb = JSON.parse(fs.readFileSync("digimon-db.json"));
  const abilityList = JSON.parse(fs.readFileSync("ability_info.json"));
  const digimonMap = new Map();
  const abilityMap = new Map();

  for (const [, digimon] of Object.entries(digimonDb)) {
    digimonMap.set(digimon.name, digimon);
  }
  for (const [, ability] of Object.entries(abilityList)) {
    abilityMap.set(ability.id, ability);
  }

  for (const [, ability] of abilityMap) {
    for (const [abilityDigimonId, abilityDigimon] of Object.entries(
      ability.digimon
    )) {
      const digimon = digimonMap.get(abilityDigimon.name);
      ability.digimon[digimon.id] = {
        id: digimon.id,
        name: digimon.name,
        icon: digimon.icon,
        img: digimon.img,
      };
      if (abilityDigimonId !== digimon.id) {
        ability.digimon[abilityDigimonId] = undefined;
      }
    }
  }

  for (const [abilityId, ability] of abilityMap) {
    data[abilityId] = ability;
  }

  writeFile(path, JSON.stringify(data));
};

// getDigimonList();
// getDigimonDetailHtml();
// getDigimonDb();
getMoveDb()
// getAbilityDb()


// const src = JSON.parse(readFile("digimon-db.json"));

// const r = new Set()
// for (const [key, v] of Object.entries(src)) {
//   if (!v.evoInto) {
//     continue
//   }

//   for (const [k1, v1] of Object.entries(Object.values(v.evoInto))) {
//     Object.keys(v1).forEach(ttt => {
//       r.add(ttt)
//     })
//   }
// }
// console.log([...r])

// 289
// Blade of the Dragon King


// 182
// Thunder Cloud II
// 282
// Golden Triangle I
// 320
// Lightning Joust
// 322
// Extinction Wave
// 350
// Celestial Blade
// 351
// Spiral Masquerade
// 363
// Transcendent Sword
// 370
// Soul Digitalization
// 379
// Shield of the Just
// 381
// Black Aura Blast
// 384
// Fist of Athena
// 385
// Supreme Cannon