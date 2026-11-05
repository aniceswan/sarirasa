typedef Json = Map<String, dynamic>;
Json jsonObject(Object? value) {
  if (value is! Map) throw const FormatException('Respons bukan objek JSON.');
  return Map<String, dynamic>.from(value);
}

String text(Json json, String key) {
  final value = json[key];
  if (value is! String) throw FormatException('Field $key tidak valid.');
  return value;
}

int integer(Json json, String key) {
  final value = json[key];
  if (value is! int || value < 0) {
    throw FormatException('Field $key bukan integer nonnegatif.');
  }
  return value;
}

DateTime instant(Json json, String key) {
  final value = text(json, key);
  final date = DateTime.tryParse(value);
  if (date == null || !RegExp(r'(Z|[+-]\d\d:\d\d)$').hasMatch(value)) {
    throw FormatException('Field $key bukan waktu UTC/offset.');
  }
  return date.toUtc();
}

List<String> strings(Json json, String key) {
  final value = json[key];
  if (value is! List || value.any((e) => e is! String)) {
    throw FormatException('Field $key bukan daftar string.');
  }
  return List<String>.unmodifiable(value);
}

double? coordinate(Json json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! num || !value.isFinite) {
    throw FormatException('Field $key tidak valid.');
  }
  return value.toDouble();
}

class Page<T> {
  final List<T> items;
  final String? nextCursor;
  final String? lastCursor;
  const Page(this.items, this.nextCursor, {this.lastCursor});
  factory Page.fromJson(Json json, T Function(Json) decode) {
    final values = json['items'];
    if (values is! List) throw const FormatException('Daftar tidak valid.');
    return Page(
      List<T>.unmodifiable(values.map((v) => decode(jsonObject(v)))),
      json['next_cursor'] as String?,
      lastCursor: json['last_cursor'] as String?,
    );
  }
}
