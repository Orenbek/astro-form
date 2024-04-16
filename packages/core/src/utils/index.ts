/* eslint-disable no-plusplus */
export function move(array: any[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return array

  if (toIndex < 0 || fromIndex < 0 || toIndex > array.length - 1 || fromIndex > array.length - 1) {
    return array
  }

  if (fromIndex < toIndex) {
    const fromItem = array[fromIndex]
    for (let index = fromIndex; index < toIndex; index++) {
      // eslint-disable-next-line no-param-reassign
      array[index] = array[index + 1]
    }
    // eslint-disable-next-line no-param-reassign
    array[toIndex] = fromItem
  } else {
    const fromItem = array[fromIndex]
    for (let index = fromIndex; index > toIndex; index--) {
      // eslint-disable-next-line no-param-reassign
      array[index] = array[index - 1]
    }
    // eslint-disable-next-line no-param-reassign
    array[toIndex] = fromItem
  }
  return array
}
