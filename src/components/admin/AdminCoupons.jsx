import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import Header from '../layout/Header'
import ThemeSelector from '../ui/ThemeSelector'

function normalizeCouponCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '')
}

export default function AdminCoupons({ activeMode, onModeChange }) {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const [form, setForm] = useState({
    code: '',
    discountPct: '10',
    usageType: 'single_use',
    isActive: true,
  })

  async function loadCoupons() {
    setLoading(true)
    setFeedback('')

    try {
      const { data, error } = await supabase
        .from('shop_coupons')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCoupons(data || [])
    } catch (loadError) {
      console.error('Error cargando cupones admin:', loadError)
      setFeedback('No se pudieron cargar los cupones.')
      setCoupons([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  async function handleCreateCoupon(event) {
    event.preventDefault()
    setSaving(true)
    setFeedback('')

    try {
      const code = normalizeCouponCode(form.code)
      const discountPct = Number(form.discountPct)

      if (!code) {
        setFeedback('El codigo del cupon es obligatorio.')
        return
      }

      if (!Number.isFinite(discountPct) || discountPct <= 0 || discountPct > 100) {
        setFeedback('El porcentaje de descuento debe estar entre 0.01 y 100.')
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      const createdBy = authData?.user?.id || null

      const { error } = await supabase.from('shop_coupons').insert({
        code,
        discount_pct: discountPct,
        usage_type: form.usageType,
        is_active: form.usageType === 'permanent' ? form.isActive : true,
        created_by: createdBy,
      })

      if (error) {
        if (String(error.message || '').toLowerCase().includes('duplicate')) {
          setFeedback('Ya existe un cupon con ese codigo.')
          return
        }
        throw error
      }

      setFeedback('Cupon creado correctamente.')
      setForm({
        code: '',
        discountPct: '10',
        usageType: 'single_use',
        isActive: true,
      })

      await loadCoupons()
    } catch (createError) {
      console.error('Error creando cupon:', createError)
      setFeedback('No se pudo crear el cupon.')
    } finally {
      setSaving(false)
    }
  }

  async function togglePermanentCoupon(coupon) {
    if (coupon.usage_type !== 'permanent') return

    try {
      const { error } = await supabase
        .from('shop_coupons')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id)

      if (error) throw error

      setCoupons((prev) =>
        prev.map((item) =>
          item.id === coupon.id ? { ...item, is_active: !coupon.is_active } : item
        )
      )
    } catch (toggleError) {
      console.error('Error alternando cupon permanente:', toggleError)
      setFeedback('No se pudo actualizar el estado del cupon permanente.')
    }
  }

  const sortedCoupons = useMemo(() => {
    return [...coupons].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [coupons])

  return (
    <div className="admin-page">
      <Header currentPage="admin-cupones">
        <ThemeSelector activeMode={activeMode} onModeChange={onModeChange} />
      </Header>

      <section className="admin-users-page" style={{ padding: 20 }}>
        <div className="admin-users-card">
          <h2>Crear cupon</h2>
          <p>
            Define cupones de un solo uso o permanentes. Los permanentes pueden activarse y
            desactivarse cuando quieras.
          </p>

          {feedback ? <div className="admin-users-feedback">{feedback}</div> : null}

          <form className="admin-coupon-form" onSubmit={handleCreateCoupon}>
            <label htmlFor="coupon-code">Codigo</label>
            <input
              id="coupon-code"
              type="text"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="Ej: AURA20"
              required
            />

            <label htmlFor="coupon-discount">Descuento (%)</label>
            <input
              id="coupon-discount"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={form.discountPct}
              onChange={(e) => setForm((prev) => ({ ...prev, discountPct: e.target.value }))}
              required
            />

            <label htmlFor="coupon-usage">Tipo de uso</label>
            <select
              id="coupon-usage"
              value={form.usageType}
              onChange={(e) => setForm((prev) => ({ ...prev, usageType: e.target.value }))}
            >
              <option value="single_use">Una sola vez</option>
              <option value="permanent">Permanente</option>
            </select>

            {form.usageType === 'permanent' ? (
              <label className="admin-coupon-checkbox" htmlFor="coupon-active">
                <input
                  id="coupon-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Crear como activo
              </label>
            ) : null}

            <button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear cupon'}
            </button>
          </form>
        </div>

        <div className="admin-users-card">
          <h3>Cupones creados</h3>

          {loading ? (
            <p>Cargando cupones...</p>
          ) : (
            <div className="admin-users-table-wrap">
              <table className="admin-users-table admin-coupons-table">
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Descuento</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCoupons.map((coupon) => {
                    const isPermanent = coupon.usage_type === 'permanent'
                    const isSingleUse = coupon.usage_type === 'single_use'
                    const singleStatus = isSingleUse
                      ? coupon.used
                        ? 'Usado'
                        : 'No usado'
                      : '-'

                    return (
                      <tr key={coupon.id}>
                        <td>{coupon.code}</td>
                        <td>{Number(coupon.discount_pct).toFixed(2)}%</td>
                        <td>{isPermanent ? 'Permanente' : 'Una sola vez'}</td>
                        <td>{isPermanent ? (coupon.is_active ? 'Activo' : 'Inactivo') : singleStatus}</td>
                        <td>
                          {isPermanent ? (
                            <label className="admin-coupon-toggle">
                              <input
                                type="checkbox"
                                checked={coupon.is_active}
                                onChange={() => togglePermanentCoupon(coupon)}
                              />
                              <span>{coupon.is_active ? 'Desactivar' : 'Activar'}</span>
                            </label>
                          ) : (
                            <span className="admin-coupon-used-note">{singleStatus}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {!sortedCoupons.length ? <p>No hay cupones creados aun.</p> : null}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
