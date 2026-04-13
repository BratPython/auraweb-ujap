# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Checkout real (Stripe + PayPal)

Este proyecto integra:

- Stripe real con PaymentIntent (backend seguro en Supabase DB Function).
- PayPal real con SDK oficial (`VITE_PAYPAL_CLIENT_ID`).
- Persistencia de facturas en Supabase (`public.shop_invoices`).

### Variables de entorno requeridas

Define en `.env`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_PAYPAL_CLIENT_ID=...
VITE_STRIPE_PUBLISHABLE_KEY=...
```

### Configurar secreto Stripe en Supabase Vault

El backend de Stripe lee el secreto desde Vault con nombre `stripe_secret_key`:

```sql
select vault.create_secret(
	'sk_test_xxx_o_sk_live_xxx',
	'stripe_secret_key',
	'Stripe secret key for AuraWeb checkout'
);
```

Si necesitas rotarlo, crea un nuevo secreto con el mismo nombre `stripe_secret_key`.
La funcion de checkout toma siempre el mas reciente por fecha.

### Flujo funcional

1. El usuario se registra/inicia sesion con Supabase Auth.
2. Define montos parciales Stripe/PayPal en la pasarela.
3. Cada metodo debe quedar confirmado para su monto.
4. Cuando la suma coincide con el total, se emite factura.
5. La factura se guarda en `public.shop_invoices` y aparece en historial del usuario.
