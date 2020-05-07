export function sort(data, { sortBy, sortType }) {
  if (typeof data === "string") {
    data = JSON.parse(data);
  }
  if (data.length === 0) {
    return data;
  }
  const fieldType = typeof data[0][sortBy];
  if (fieldType === "string") {
    data.sort((a, b) => {
      return a[sortBy].localeCompare(b[sortBy]);
    });
    if (sortType === "desc") {
      data.reverse();
    }
  }
  if (fieldType === "number") {
    data.sort((a, b) => {
      if (a[sortBy] > b[sortBy]) {
        return sortType === "asc" ? 1 : -1;
      }
      if (a[sortBy] < b[sortBy]) {
        return sortType === "asc" ? -1 : 1;
      }
      return 0;
    });
  }

  return data;
}
