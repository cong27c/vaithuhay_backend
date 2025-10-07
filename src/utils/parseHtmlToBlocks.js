function parseHtmlToBlocks(html) {
  try {
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const blocks = [];

    // ✅ Hàm xử lý table (cải tiến)
    function parseTableLike(node) {
      const data = [];
      Array.from(node.querySelectorAll("tr")).forEach((tr) => {
        const tds = Array.from(tr.querySelectorAll("td, th"));

        if (tds.length >= 2) {
          const keyTd = tds[0];
          const valueTd = tds[1];

          // Lấy key - ưu tiên strong tag, sau đó lấy textContent
          let key = "";
          const strongEl = keyTd.querySelector("strong");
          if (strongEl) {
            key = strongEl.textContent.trim();
          } else {
            key = keyTd.textContent.trim();
          }

          // Xử lý value
          let value = "";

          // Nếu valueTd có table con → parse tiếp
          const nestedTable = valueTd.querySelector("table");
          if (nestedTable) {
            const nestedData = [];
            Array.from(nestedTable.querySelectorAll("tr")).forEach((tr2) => {
              const td2 = tr2.querySelector("td, th");
              if (td2) {
                const txt = td2.textContent.trim();
                if (txt) nestedData.push(txt);
              }
            });
            value = nestedData.join(", ");
          } else {
            // parse text thường
            value = Array.from(valueTd.childNodes)
              .map((child) => {
                if (child.nodeType === 3) {
                  // Text node
                  return child.textContent.replace(/\s+/g, " ").trim();
                } else if (child.nodeName.toLowerCase() === "br") {
                  return "\n";
                }
                return child.textContent.replace(/\s+/g, " ").trim();
              })
              .filter((text) => text.length > 0)
              .join("")
              .replace(/\n+/g, "\n")
              .trim();
          }

          // Chuẩn hóa key và value
          key = key
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          value = value
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          if (key && value) {
            data.push([key, value]);
          }
        }
      });

      if (data.length > 0) {
        blocks.push({
          type: "table",
          data,
        });
        return true; // Đã xử lý table thành công
      }
      return false;
    }

    // ✅ ƯU TIÊN: Kiểm tra toàn bộ document có phải là table không
    const tableElements = doc.querySelectorAll("table, tbody");
    if (tableElements.length > 0) {
      let tableFound = false;
      tableElements.forEach((tableEl) => {
        if (parseTableLike(tableEl)) {
          tableFound = true;
        }
      });

      // Nếu đã xử lý table thành công thì return luôn
      if (tableFound) {
        return blocks;
      }
    }

    // ✅ Fallback: Nếu HTML có cấu trúc table nhưng không có thẻ table bao ngoài
    if (
      html.includes("</td>") &&
      html.includes("</tr>") &&
      html.includes("<td")
    ) {
      // Thử parse như table một lần nữa từ toàn bộ HTML
      const tempDom = new JSDOM(`<table>${html}</table>`);
      if (parseTableLike(tempDom.window.document)) {
        return blocks;
      }
    }

    // ✅ Duyệt tất cả node trong body (cho các trường hợp không phải table)
    doc.body.childNodes.forEach((node) => {
      const tag = node.nodeName.toLowerCase();

      switch (tag) {
        case "p": {
          const strongInP = node.querySelector("strong");
          if (strongInP) {
            blocks.push({
              type: "subTitle",
              content: strongInP.textContent.trim(),
            });
          } else if (node.querySelector("img")) {
            node.querySelectorAll("img").forEach((img) => {
              const src = img.src || img.getAttribute("srcset")?.split(" ")[0];
              if (src) {
                blocks.push({
                  type: "image",
                  src: src.startsWith("//") ? "https:" + src : src,
                  alt: img.alt || "",
                });
              }
            });
          } else if (node.querySelector("iframe")) {
            node.querySelectorAll("iframe").forEach((iframe) => {
              if (iframe.src) {
                blocks.push({
                  type: "video",
                  src: iframe.src,
                });
              }
            });
          } else {
            const text = node.textContent.trim();
            if (text) {
              blocks.push({
                type: "text",
                content: text,
              });
            }
          }
          break;
        }

        case "h1":
        case "h2":
        case "h3": {
          const txt = node.textContent.trim();
          if (txt) {
            blocks.push({
              type: "subTitle",
              content: txt,
            });
          }
          break;
        }

        case "ul": {
          const items = Array.from(node.querySelectorAll("li"))
            .map((li) => li.textContent.trim())
            .filter(Boolean);
          if (items.length > 0) {
            blocks.push({
              type: "list",
              items,
            });
          }
          break;
        }

        case "table":
        case "tbody": {
          parseTableLike(node);
          break;
        }

        case "#text": {
          const txt = node.textContent.trim();
          if (txt.length > 0) {
            // Kiểm tra xem có phải là cấu trúc table ẩn không
            if (txt.includes("</td>") || txt.includes("</tr>")) {
              // Bỏ qua, vì đã xử lý table ở phần ưu tiên
            } else {
              blocks.push({
                type: "text",
                content: txt,
              });
            }
          }
          break;
        }

        default:
          // Kiểm tra các thẻ div có thể chứa table
          if (
            node.querySelector &&
            (node.querySelector("table") || node.querySelector("tbody"))
          ) {
            const tableEl =
              node.querySelector("table") || node.querySelector("tbody");
            parseTableLike(tableEl);
          }
          break;
      }
    });

    // ✅ Nếu không có block nào được tạo, kiểm tra text content toàn bộ
    if (blocks.length === 0) {
      const textContent = doc.body.textContent.trim();
      if (textContent) {
        blocks.push({
          type: "text",
          content: textContent,
        });
      }
    }

    return blocks;
  } catch (error) {
    console.log("Error in parseHtmlToBlocks:", error);
    return [];
  }
}

module.exports = parseHtmlToBlocks;
