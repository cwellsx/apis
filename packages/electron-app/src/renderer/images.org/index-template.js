// index-template.js
const path = require("path");

function defaultIndexTemplate(filePaths) {
  const exportEntries = filePaths.map(({ path: filePath, originalPath }) => {
    const basename = path.basename(filePath, path.extname(filePath));
    const index = basename.indexOf("Fill0Wght400Grad0Opsz24");
    const exportName = `Svg${index === -1 ? basename : basename.substring(0, index)}`;
    return `export { default as ${exportName} } from './${basename}'`;
  });
  return exportEntries.join("\n");
}

module.exports = defaultIndexTemplate;
