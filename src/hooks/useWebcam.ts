'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { WebcamState } from '@/types/pose'

interface UseWebcamOptions {
  width?: number
  height?: number
  facingMode?: 'user' | 'environment'
}

export function useWebcam(options: UseWebcamOptions = {}) {
  const { width = 640, height = 480, facingMode = 'user' } = options

  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<WebcamState>({
    stream: null,
    isReady: false,
    error: null,
  })

  const startCamera = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }))

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode,
          frameRate: { ideal: 30, min: 24 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'))
            return
          }

          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
              .then(() => resolve())
              .catch(reject)
          }

          videoRef.current.onerror = () => {
            reject(new Error('Video loading failed'))
          }
        })

        setState({
          stream,
          isReady: true,
          error: null,
        })
      }
    } catch (error) {
      let errorMessage = '카메라를 시작할 수 없습니다'

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = '카메라 접근 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.'
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.'
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = '카메라가 다른 프로그램에서 사용 중입니다.'
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = '요청한 카메라 설정을 지원하지 않습니다.'
        } else {
          errorMessage = error.message
        }
      }

      setState({
        stream: null,
        isReady: false,
        error: errorMessage,
      })
    }
  }, [width, height, facingMode])

  const stopCamera = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop())
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setState({
      stream: null,
      isReady: false,
      error: null,
    })
  }, [state.stream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [state.stream])

  return {
    videoRef,
    ...state,
    startCamera,
    stopCamera,
  }
}
