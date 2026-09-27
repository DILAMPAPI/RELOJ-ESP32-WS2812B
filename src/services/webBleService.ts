/**
 * Driver Web Bluetooth API para conectar directamente al ESP32-C3 físico
 * desde Google Chrome / Microsoft Edge / Chrome para Android.
 * Servicio: Nordic UART Service (NUS)
 */

export class WebBleService {
  public static readonly SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  public static readonly RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
  public static readonly TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

  private device: any = null;
  private rxCharacteristic: any = null;
  private txCharacteristic: any = null;
  private txBuffer: string = '';

  public onTxResponse: ((line: string) => void) | null = null;
  public onDisconnected: (() => void) | null = null;

  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public async requestAndConnect(): Promise<string> {
    if (!WebBleService.isSupported()) {
      throw new Error('Web Bluetooth no está soportado en este navegador. Usa Chrome o Edge.');
    }

    // Solicitar dispositivo BLE con filtro NUS y nombre
    this.device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        { name: 'Reloj ESP32' },
        { services: [WebBleService.SERVICE_UUID] },
      ],
      optionalServices: [WebBleService.SERVICE_UUID],
    });

    this.device.addEventListener('gattserverdisconnected', () => {
      this.rxCharacteristic = null;
      this.txCharacteristic = null;
      if (this.onDisconnected) {
        this.onDisconnected();
      }
    });

    const server = await this.device.gatt.connect();
    const service = await server.getPrimaryService(WebBleService.SERVICE_UUID);

    this.rxCharacteristic = await service.getCharacteristic(WebBleService.RX_UUID);
    this.txCharacteristic = await service.getCharacteristic(WebBleService.TX_UUID);

    // Escuchar notificaciones TX (ESP32 -> App)
    await this.txCharacteristic.startNotifications();
    this.txCharacteristic.addEventListener('characteristicvaluechanged', (event: any) => {
      const value = event.target.value;
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(value);
      this.handleIncomingChunk(text);
    });

    return this.device.name || 'Reloj ESP32';
  }

  private handleIncomingChunk(text: string) {
    this.txBuffer += text;
    while (this.txBuffer.includes('\n')) {
      const idx = this.txBuffer.indexOf('\n');
      const line = this.txBuffer.substring(0, idx).replace('\r', '').trim();
      this.txBuffer = this.txBuffer.substring(idx + 1);
      if (line.length > 0 && this.onTxResponse) {
        this.onTxResponse(line);
      }
    }
  }

  public async sendCommand(command: string): Promise<void> {
    if (!this.rxCharacteristic) {
      throw new Error('No hay conexión BLE activa con el reloj');
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(command.endsWith('\n') ? command : `${command}\n`);
    await this.rxCharacteristic.writeValue(data);
  }

  public disconnect(): void {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.rxCharacteristic = null;
    this.txCharacteristic = null;
    this.device = null;
  }

  public isConnected(): boolean {
    return !!(this.device && this.device.gatt && this.device.gatt.connected);
  }
}
