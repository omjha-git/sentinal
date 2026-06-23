export function fileTreeToWebContainer(files) {
  const result = {};

  function process(items, target) {
    items.forEach((item) => {
      if (item.type === "folder") {
        target[item.name] = {
          directory: {},
        };

        process(
          item.children || [],
          target[item.name].directory
        );
      } else {
        target[item.name] = {
          file: {
            contents: item.content || "",
          },
        };
      }
    });
  }

  process(files, result);

  return result;
}