import type { SectionTree, WordRecord } from "@/lib/types";
import type { TreeSelection } from "@/components/LibraryPicker";

/** Ports collectWords() from the reference artifact — flattens the tree down to a scope. */
export function collectWords(tree: SectionTree, sel: TreeSelection, level: "list" | "folder" | "library"): WordRecord[] {
  const out: WordRecord[] = [];
  const libraries = sel.library ? [sel.library] : Object.keys(tree);
  libraries.forEach((lib) => {
    const libNode = tree[lib];
    if (!libNode) return;
    const folders = level === "library" ? Object.keys(libNode.folders) : sel.folder ? [sel.folder] : Object.keys(libNode.folders);
    folders.forEach((folder) => {
      const folderNode = libNode.folders[folder];
      if (!folderNode) return;
      const lists = level === "list" && sel.list ? [sel.list] : Object.keys(folderNode.lists);
      lists.forEach((listName) => {
        const listNode = folderNode.lists[listName];
        if (listNode) out.push(...listNode.words);
      });
    });
  });
  return out;
}
