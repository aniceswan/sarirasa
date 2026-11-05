/// Developer controls are explicitly enabled at build time, never by users.
abstract final class AppConfig {
  static const developerSettings = bool.fromEnvironment('DEVELOPER_SETTINGS');
  static const apiOrigin = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'https://202-155-91-101.nevacloud.net',
  );
}
