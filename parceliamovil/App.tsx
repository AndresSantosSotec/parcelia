import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, BackHandler, Platform, StyleSheet, Text, View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { StatusBar } from 'expo-status-bar'

const APP_URL = 'https://kottaninmobiliaria.stockgenius-sotecpro.com/'
const APP_NOMBRE = 'Kottan'

export default function App() {
  const web = useRef<WebView>(null)
  const [puedeVolver, setPuedeVolver] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (puedeVolver) {
        web.current?.goBack()
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [puedeVolver])

  async function alMensaje(evento: WebViewMessageEvent) {
    try {
      const datos = JSON.parse(evento.nativeEvent.data) as {
        tipo?: string
        url?: string
        nombre?: string
        token?: string
      }
      if (datos.tipo !== 'descarga' || !datos.url) return
      const nombre = String(datos.nombre || 'documento.pdf').replace(/[^\w.\-]+/g, '_')
      const destino = `${FileSystem.cacheDirectory}${nombre}`
      const resultado = await FileSystem.downloadAsync(datos.url, destino, {
        headers: {
          Authorization: datos.token ? `Bearer ${datos.token}` : '',
          Accept: 'application/pdf',
        },
      })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(resultado.uri, {
          mimeType: 'application/pdf',
          dialogTitle: nombre,
        })
      }
    } catch {
      // La pantalla de TerraCloud sigue abierta si la descarga falla.
    }
  }

  return (
    <View style={estilos.pantalla}>
      <StatusBar style="light" />
      <WebView
        ref={web}
        source={{ uri: APP_URL }}
        applicationNameForUserAgent="TerraCloudApp"
        onLoadEnd={() => setCargando(false)}
        onNavigationStateChange={(estado) => setPuedeVolver(estado.canGoBack)}
        onMessage={alMensaje}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
      />
      {cargando ? (
        <View style={estilos.carga}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={estilos.texto}>Abriendo {APP_NOMBRE}</Text>
        </View>
      ) : null}
    </View>
  )
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#0c1f18' },
  carga: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c1f18',
    gap: 12,
  },
  texto: { color: '#d1fae5', fontSize: 16 },
})
