(function () {
  "use strict";

  const ENDPOINT = "https://bible.cecp.workers.dev/";
  const BOOK_ROWS = [
    [1,"创世记","GEN","csj"],[2,"出埃及记","EXO","caj"],[3,"利未记","LEV","lwj"],[4,"民数记","NUM","msj"],
    [5,"申命记","DEU","smj"],[6,"约书亚记","JOS","ysaj"],[7,"士师记","JDG","ssj"],[8,"路得记","RUT","ldj"],
    [9,"撒母耳记上","1SA","smesjs,smesj"],[10,"撒母耳记下","2SA","smesjx,smesx"],[11,"列王纪上","1KI","lwjs"],[12,"列王纪下","2KI","lwjx"],
    [13,"历代志上","1CH","ldzs"],[14,"历代志下","2CH","ldzx"],[15,"以斯拉记","EZR","yslj"],[16,"尼希米记","NEH","nxmj"],
    [17,"以斯帖记","EST","ystj"],[18,"约伯记","JOB","ybj"],[19,"诗篇","PSA","sp"],[20,"箴言","PRO","zy"],
    [21,"传道书","ECC","cds"],[22,"雅歌","SNG","yg"],[23,"以赛亚书","ISA","ysys"],[24,"耶利米书","JER","ylms"],
    [25,"耶利米哀歌","LAM","ylmag"],[26,"以西结书","EZK","yxjs"],[27,"但以理书","DAN","dyls"],[28,"何西阿书","HOS","hxas"],
    [29,"约珥书","JOL","yes"],[30,"阿摩司书","AMO","amss"],[31,"俄巴底亚书","OBA","ebdys"],[32,"约拿书","JON","yns"],
    [33,"弥迦书","MIC","mjs"],[34,"那鸿书","NAM","nhs"],[35,"哈巴谷书","HAB","hbgs"],[36,"西番雅书","ZEP","xfnys"],
    [37,"哈该书","HAG","hgs"],[38,"撒迦利亚书","ZEC","sjlys"],[39,"玛拉基书","MAL","mljs"],[40,"马太福音","MAT","mtfy"],
    [41,"马可福音","MRK","mkfy"],[42,"路加福音","LUK","ljfy"],[43,"约翰福音","JHN","yhfy"],[44,"使徒行传","ACT","stxc"],
    [45,"罗马书","ROM","lms"],[46,"哥林多前书","1CO","gldqs"],[47,"哥林多后书","2CO","gldhs"],[48,"加拉太书","GAL","jlts"],
    [49,"以弗所书","EPH","yfss"],[50,"腓立比书","PHP","flbs"],[51,"歌罗西书","COL","glxs"],[52,"帖撒罗尼迦前书","1TH","tslnjq"],
    [53,"帖撒罗尼迦后书","2TH","tslnjh"],[54,"提摩太前书","1TI","tmtqs"],[55,"提摩太后书","2TI","tmths"],[56,"提多书","TIT","tds"],
    [57,"腓利门书","PHM","flms2"],[58,"希伯来书","HEB","xbls"],[59,"雅各书","JAS","ygs"],[60,"彼得前书","1PE","bdqs"],
    [61,"彼得后书","2PE","bdhs"],[62,"约翰一书","1JN","yhys"],[63,"约翰二书","2JN","yhes"],[64,"约翰三书","3JN","yhss"],
    [65,"犹大书","JUD","yds"],[66,"启示录","REV","qsl"]
  ];

  const BOOKS = BOOK_ROWS.map((row) => ({
    id: row[0],
    cn: row[1],
    usfm: row[2],
    aliases: [row[1], row[2]].concat(row[3].split(","))
  }));

  const aliasMap = new Map();
  BOOKS.forEach((book) => book.aliases.forEach((alias) => aliasMap.set(String(alias).toLowerCase(), book)));

  function parseReference(input) {
    const raw = String(input || "")
      .trim()
      .replace(/[，,]/g, " ")
      .replace(/[：:]/g, " ")
      .replace(/[．.]/g, " ")
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, " ");
    if (!raw) throw new Error("请输入经文引用");

    const lower = raw.toLowerCase();
    let book = null;
    let rest = "";
    const aliases = Array.from(aliasMap.keys()).sort((a, b) => b.length - a.length);
    for (const alias of aliases) {
      if (lower === alias || lower.startsWith(alias + " ") || lower.startsWith(alias)) {
        book = aliasMap.get(alias);
        rest = raw.slice(alias.length).trim();
        break;
      }
    }
    if (!book) throw new Error("找不到经卷名称或 USFM 缩写");

    const numbers = rest.match(/\d+/g)?.map(Number) || [];
    if (!numbers[0]) throw new Error("请输入章节");
    const chapter = numbers[0];
    const start = numbers[1] || null;
    const end = numbers[2] || start;
    return { book, chapter, start, end };
  }

  function titleFor(ref) {
    if (!ref.start) return ref.book.cn + " " + ref.chapter;
    return ref.book.cn + " " + ref.chapter + ":" + ref.start + (ref.end !== ref.start ? "–" + ref.end : "");
  }

  async function fetchPassage(input, primary, secondary) {
    const ref = parseReference(input);
    const translations = [primary || "CUNPSS", secondary].filter(Boolean);
    const url = new URL(ENDPOINT);
    url.searchParams.set("translations", translations.join(","));
    url.searchParams.set("book", String(ref.book.id));
    url.searchParams.set("chapter", String(ref.chapter));
    if (ref.start) url.searchParams.set("verses", ref.start === ref.end ? String(ref.start) : ref.start + "-" + ref.end);
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) throw new Error("经文服务暂时不可用");
    const payload = await response.json();
    if (!payload?.ok) throw new Error(payload?.error || "经文查询失败");

    const first = payload.data?.[primary || "CUNPSS"] || [];
    const second = secondary ? (payload.data?.[secondary] || []) : [];
    if (!first.length && !second.length) throw new Error("没有找到这段经文");
    const secondMap = new Map(second.map((verse) => [String(verse.verse), verse.text]));
    const verses = (first.length ? first : second).map((verse) => ({
      verse: String(verse.verse || ""),
      primary: String(verse.text || ""),
      secondary: String(secondMap.get(String(verse.verse)) || "")
    }));
    return {
      reference: input,
      title: titleFor(ref),
      primary: primary || "CUNPSS",
      secondary: secondary || "",
      verses
    };
  }

  window.CECPBibleService = { BOOKS, parseReference, fetchPassage };
})();
