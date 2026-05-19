import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'

const STORAGE_BUCKET = 'recursos_aura'
const STORAGE_FOLDER = 'landing-video'

export default function VideoSettingsModal({ open, onClose }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState({})
  const [status, setStatus] = useState('')
  const mountedRef = useRef(true)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('landing_video_settings')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) setSettings(data)
    } catch (err) {
      console.error('Error fetching video settings:', err)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (open) fetchSettings()
  }, [open])

  async function uploadFile(file, fileName) {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(`${STORAGE_FOLDER}/${fileName}`, file, { upsert: true })

    if (error) throw error

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(`${STORAGE_FOLDER}/${fileName}`)

    return data.publicUrl
  }

  async function handleUpload(field, file) {
    if (!file) return
    setUploading(prev => ({ ...prev, [field]: true }))
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${field}.${ext}`
      const url = await uploadFile(file, fileName)
      setSettings(prev => ({ ...prev, [field]: url }))
      setStatus(`${field} subido correctamente`)
    } catch (err) {
      console.error(`Error uploading ${field}:`, err)
      setStatus(`Error al subir ${field}: ${err.message}`)
    } finally {
      if (mountedRef.current) setUploading(prev => ({ ...prev, [field]: false }))
    }
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    try {
      const payload = {
        video_url: settings.video_url,
        audio_track_1_url: settings.audio_track_1_url,
        audio_track_2_url: settings.audio_track_2_url,
        subtitles_track_1_url: settings.subtitles_track_1_url,
        subtitles_track_2_url: settings.subtitles_track_2_url,
        subtitles_track_1_name: settings.subtitles_track_1_name,
        subtitles_track_2_name: settings.subtitles_track_2_name,
        is_enabled: settings.is_enabled,
        updated_at: new Date().toISOString(),
      }

      const { data: existing } = await supabase
        .from('landing_video_settings')
        .select('id')
        .limit(1)
        .single()

      let result
      if (existing) {
        result = await supabase
          .from('landing_video_settings')
          .update(payload)
          .eq('id', existing.id)
          .select()
      } else {
        result = await supabase
          .from('landing_video_settings')
          .insert(payload)
          .select()
      }

      if (result.error) throw result.error
      if (result.data?.[0]) setSettings(result.data[0])
      setStatus('Configuración guardada correctamente')
    } catch (err) {
      console.error('Error saving settings:', err)
      setStatus(`Error al guardar: ${err.message}`)
    } finally {
      if (mountedRef.current) setSaving(false)
    }
  }

  function handleNameChange(field, value) {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '620px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Video Landing</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {loading ? (
          <div className="uploading-state"><p>Cargando configuración...</p></div>
        ) : settings ? (
          <div className="video-settings-form">
            <UploadField
              label="Video (.mp4)"
              field="video_url"
              currentUrl={settings.video_url}
              uploading={uploading.video_url}
              accept=".mp4"
              onUpload={handleUpload}
            />

            <UploadField
              label="Audio Track 1 (.mp3)"
              field="audio_track_1_url"
              currentUrl={settings.audio_track_1_url}
              uploading={uploading.audio_track_1_url}
              accept=".mp3"
              onUpload={handleUpload}
            />

            <div className="form-group">
              <label>Nombre Subtítulos Track 1</label>
              <input
                type="text"
                value={settings.subtitles_track_1_name || ''}
                onChange={e => handleNameChange('subtitles_track_1_name', e.target.value)}
                placeholder="ej: Español"
              />
            </div>

            <UploadField
              label="Subtítulos Track 1 (.vtt)"
              field="subtitles_track_1_url"
              currentUrl={settings.subtitles_track_1_url}
              uploading={uploading.subtitles_track_1_url}
              accept=".vtt"
              onUpload={handleUpload}
            />

            <hr style={{ margin: '20px 0', borderColor: 'rgba(128,128,128,.15)' }} />

            <UploadField
              label="Audio Track 2 (.mp3)"
              field="audio_track_2_url"
              currentUrl={settings.audio_track_2_url}
              uploading={uploading.audio_track_2_url}
              accept=".mp3"
              onUpload={handleUpload}
            />

            <div className="form-group">
              <label>Nombre Subtítulos Track 2</label>
              <input
                type="text"
                value={settings.subtitles_track_2_name || ''}
                onChange={e => handleNameChange('subtitles_track_2_name', e.target.value)}
                placeholder="ej: English"
              />
            </div>

            <UploadField
              label="Subtítulos Track 2 (.vtt)"
              field="subtitles_track_2_url"
              currentUrl={settings.subtitles_track_2_url}
              uploading={uploading.subtitles_track_2_url}
              accept=".vtt"
              onUpload={handleUpload}
            />

            <hr style={{ margin: '20px 0', borderColor: 'rgba(128,128,128,.15)' }} />

            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
              <label style={{ margin: 0 }}>Mostrar video en landing:</label>
              <label className="admin-toggle-switch" style={{ display: 'inline-flex' }}>
                <input
                  type="checkbox"
                  checked={settings.is_enabled}
                  onChange={e => setSettings(prev => ({ ...prev, is_enabled: e.target.checked }))}
                />
                <span className="admin-toggle-slider" />
              </label>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                className="cta"
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '10px 24px' }}
              >
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </button>
              {status ? (
                <span style={{
                  fontSize: '13px',
                  color: status.includes('Error') ? 'var(--danger, #e00)' : 'var(--accent)'
                }}>
                  {status}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="uploading-state"><p>No se pudo cargar la configuración.</p></div>
        )}
      </div>
    </div>
  )
}

function UploadField({ label, field, currentUrl, uploading, accept, onUpload }) {
  const fileRef = useRef(null)
  const fileName = currentUrl ? currentUrl.split('/').pop()?.split('?')[0] : null

  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          type="button"
          className="btn-upload"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Subiendo...' : fileName || 'Seleccionar archivo'}
        </button>
        {fileName ? (
          <span style={{ fontSize: '12px', opacity: .7, wordBreak: 'break-all' }}>{fileName}</span>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) onUpload(field, file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
