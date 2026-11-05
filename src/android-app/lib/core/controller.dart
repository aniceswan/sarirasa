import 'package:flutter/foundation.dart';

import 'api/api_error.dart';

class Controller extends ChangeNotifier {
  bool busy = false, disposed = false;
  String? error;
  Map<String, List<String>> fields = {};
  void changed() {
    if (!disposed) notifyListeners();
  }

  Future<bool> perform(Future<void> Function() action) async {
    if (busy || disposed) return false;
    busy = true;
    error = null;
    fields = {};
    changed();
    try {
      await action();
      return !disposed;
    } on ApiError catch (e) {
      error = e.message;
      fields = e.fieldErrors;
      return false;
    } catch (e) {
      error =
          'Belum dapat memproses. Periksa jaringan dan penyimpanan perangkat.';
      return false;
    } finally {
      busy = false;
      changed();
    }
  }

  @override
  void dispose() {
    disposed = true;
    super.dispose();
  }
}
