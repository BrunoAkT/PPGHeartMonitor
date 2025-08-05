package com.brunoakt.PPGprojectTestIII.ppgtestcamera

import android.graphics.ImageFormat
import android.util.Log
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import java.util.LinkedList

class PpgtestcameraPlugin(proxy: VisionCameraProxy, options: Map<String, Any>?) : FrameProcessorPlugin() {

    // Usaremos uma LinkedList para manter um histórico dos valores e calcular a média (DC)
    private val signalHistory = LinkedList<Double>()
    private val historySize = 50 // Tamanho da janela para calcular a média móvel (DC)

    override fun callback(frame: Frame, arguments: Map<String, Any>?): Any? {
        // Garantir que a imagem seja válida e no formato correto
        if (frame.image.format != ImageFormat.YUV_420_888) {
            Log.w("PPG", "Formato de imagem não suportado")
            return null // Retorne nulo ou algo que indique um erro
        }
        val image = frame.image

        // Extração da média do canal Vermelho (seu código atual está bom aqui)
        val yBuffer = image.planes[0].buffer
        val uBuffer = image.planes[1].buffer
        val vBuffer = image.planes[2].buffer
        val yRowStride = image.planes[0].rowStride
        val uvRowStride = image.planes[1].rowStride
        val uvPixelStride = image.planes[1].pixelStride
        val width = image.width
        val height = image.height

        val centerX = width / 2
        val centerY = height / 2
        val regionSize = 10

        var sumRed = 0.0
        var count = 0

        for (y in (centerY - regionSize)..(centerY + regionSize)) {
            for (x in (centerX - regionSize)..(centerX + regionSize)) {
                val yIndex = y * yRowStride + x
                val uvIndex = (y / 2) * uvRowStride + (x / 2) * uvPixelStride

                if (yIndex >= yBuffer.limit() || uvIndex >= vBuffer.limit()) continue

                val yValue = yBuffer.get(yIndex).toInt() and 0xFF
                val vValue = vBuffer.get(uvIndex).toInt() and 0xFF

                // Conversão YUV -> R (simplificada e eficiente)
                val red = (yValue + 1.13983 * (vValue - 128)).toInt().coerceIn(0, 255)
                sumRed += red
                count++
            }
        }

        if (count == 0) return null

        val currentAvgRed = sumRed / count // Este é o nosso sinal bruto (AC + DC)

        // --- LÓGICA DE NORMALIZAÇÃO AC/DC ---
        // Adiciona o valor atual ao histórico
        signalHistory.add(currentAvgRed)
        // Mantém o histórico com um tamanho fixo
        if (signalHistory.size > historySize) {
            signalHistory.removeFirst()
        }

        // Calcula a média do histórico (Componente DC)
        val dcComponent = signalHistory.average()

        if (dcComponent == 0.0) return null // Evita divisão por zero no início

        // Normaliza o sinal para obter o componente AC
        // O resultado será um valor pequeno que oscila em torno de 0
        val acComponent = currentAvgRed / dcComponent - 1

        // Crie um mapa para retornar ambos os valores
        val result = mapOf(
            "ac" to acComponent,
            "dc" to currentAvgRed // Ou dcComponent, mas o vermelho bruto é mais direto
        )
        return result
    }
}