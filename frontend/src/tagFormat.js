// Tag Kuma diteruskan apa adanya dari backend (lihat README backend) -- bentuknya
// bisa beda dikit antar versi Kuma, jadi dibaca defensif di sini, bukan diasumsikan
// satu bentuk field yang pasti ada.
export function tagKey(tag, index) {
  return tag?.id ?? tag?.tag_id ?? tag?.name ?? index;
}

export function tagLabel(tag) {
  const name = tag?.name ?? tag?.tag?.name ?? '';
  const value = tag?.value ?? '';
  return value ? `${name}: ${value}` : name;
}

export function tagColor(tag) {
  return tag?.color ?? tag?.tag?.color ?? null;
}
