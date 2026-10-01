import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:reloj_esp32/main.dart';
import 'package:reloj_esp32/services/ble_service.dart';

void main() {
  testWidgets('RelojEsp32App smoke test', (WidgetTester tester) async {
    // Build our app with ChangeNotifierProvider and trigger a frame.
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => BleService(),
        child: const RelojEsp32App(),
      ),
    );

    // Verify that app is rendered.
    expect(find.byType(RelojEsp32App), findsOneWidget);
  });
}
