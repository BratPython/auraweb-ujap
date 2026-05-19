import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'

export default function VideoPlayerSection() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [audioTrack, setAudioTrack] = useState('original')
  const [activeSubtitle, setActiveSubtitle] = useState('none')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const videoRef = useRef(null)
  const audio1Ref = useRef(null)
  const audio2Ref = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('landing_video_settings')
          .select('*')
          .limit(1)
          .single()

        if (data?.is_enabled && data?.video_url) {
          setSettings(data)
        }
      } catch (err) {
        console.error('Error loading video settings:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onLoaded = () => {
      setDuration(video.duration || 0)
    }

    const onTime = () => {
      setCurrentTime(video.currentTime)
      syncAudio()
    }

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('ended', () => setPlaying(false))

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('ended', () => setPlaying(false))
    }
  }, [settings])

  function syncAudio() {
    const video = videoRef.current
    if (!video) return

    const audios = [audio1Ref.current, audio2Ref.current]
    audios.forEach(audio => {
      if (!audio) return
      if (audio.currentTime < video.currentTime - 0.5 || audio.currentTime > video.currentTime + 0.5) {
        audio.currentTime = video.currentTime
      }
    })
  }

  function togglePlay() {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      playActiveAudio()
      setPlaying(true)
    } else {
      video.pause()
      pauseAllAudio()
      setPlaying(false)
    }
  }

  function playActiveAudio() {
    pauseAllAudio()
    const video = videoRef.current
    if (!video) return

    if (audioTrack === 'audio1' && audio1Ref.current) {
      audio1Ref.current.currentTime = video.currentTime
      audio1Ref.current.play()
    } else if (audioTrack === 'audio2' && audio2Ref.current) {
      audio2Ref.current.currentTime = video.currentTime
      audio2Ref.current.play()
    }
  }

  function pauseAllAudio() {
    [audio1Ref.current, audio2Ref.current].forEach(a => {
      if (a) a.pause()
    })
  }

  function handleAudioTrackChange(track) {
    pauseAllAudio()
    setAudioTrack(track)
    const video = videoRef.current
    if (!video) return

    if (playing && track.startsWith('audio')) {
      setTimeout(() => {
        const audioEl = track === 'audio1' ? audio1Ref.current : audio2Ref.current
        if (audioEl) {
          audioEl.currentTime = video.currentTime
          audioEl.play()
        }
      }, 50)
    }
  }

  function handleVolumeChange(e) {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (videoRef.current) videoRef.current.volume = v
    if (audio1Ref.current) audio1Ref.current.volume = v
    if (audio2Ref.current) audio2Ref.current.volume = v
  }

  function handleSeek(e) {
    const time = parseFloat(e.target.value)
    if (videoRef.current) videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading || !settings) return null

  const subtitleOptions = [
    { value: 'none', label: 'Sin subtítulos' },
  ]
  if (settings.subtitles_track_1_url) {
    subtitleOptions.push({ value: 'sub1', label: settings.subtitles_track_1_name || 'Subtítulos 1' })
  }
  if (settings.subtitles_track_2_url) {
    subtitleOptions.push({ value: 'sub2', label: settings.subtitles_track_2_name || 'Subtítulos 2' })
  }

  const audioOptions = [
    { value: 'original', label: 'Audio Original' },
  ]
  if (settings.audio_track_1_url) {
    audioOptions.push({ value: 'audio1', label: settings.subtitles_track_1_name || 'Audio Track 1' })
  }
  if (settings.audio_track_2_url) {
    audioOptions.push({ value: 'audio2', label: settings.subtitles_track_2_name || 'Audio Track 2' })
  }

  return (
    <section className="video-player-section">
      <h2 className="section-title" style={{ marginBottom: '24px' }}>Conoce más</h2>

      <div className="video-player-container">
        <video
          ref={videoRef}
          src={settings.video_url}
          muted={audioTrack !== 'original'}
          preload="metadata"
          playsInline
          style={{ width: '100%', display: 'block', borderRadius: '8px 8px 0 0' }}
          onClick={togglePlay}
        >
          {activeSubtitle === 'sub1' && settings.subtitles_track_1_url ? (
            <track kind="subtitles" src={settings.subtitles_track_1_url} srcLang="es" label={settings.subtitles_track_1_name || 'Subtítulos 1'} default />
          ) : null}
          {activeSubtitle === 'sub2' && settings.subtitles_track_2_url ? (
            <track kind="subtitles" src={settings.subtitles_track_2_url} srcLang="en" label={settings.subtitles_track_2_name || 'Subtítulos 2'} default />
          ) : null}
        </video>

        {settings.audio_track_1_url ? (
          <audio ref={audio1Ref} src={settings.audio_track_1_url} preload="metadata" />
        ) : null}
        {settings.audio_track_2_url ? (
          <audio ref={audio2Ref} src={settings.audio_track_2_url} preload="metadata" />
        ) : null}

        <div className="video-controls">
          <div className="video-controls-row">
            <button
              className="video-btn-play"
              onClick={togglePlay}
              aria-label={playing ? 'Pausar' : 'Reproducir'}
            >
              {playing ? '⏸' : '▶'}
            </button>

            <div className="video-progress-wrapper">
              <input
                type="range"
                className="video-progress"
                min="0"
                max={duration || 0}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
              />
              <span className="video-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>

            <div className="video-volume-wrapper">
              <span style={{ fontSize: '14px' }}>{volume === 0 ? '🔇' : '🔊'}</span>
              <input
                type="range"
                className="video-volume"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
              />
            </div>
          </div>

          <div className="video-controls-row">
            <div className="video-select-group">
              <label>Audio:</label>
              <select
                value={audioTrack}
                onChange={e => handleAudioTrackChange(e.target.value)}
              >
                {audioOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="video-select-group">
              <label>Subtítulos:</label>
              <select
                value={activeSubtitle}
                onChange={e => setActiveSubtitle(e.target.value)}
              >
                {subtitleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
