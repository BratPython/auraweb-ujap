import { useState, useEffect } from 'react';

export default function ConversorBCV() {
  const [tasaBCV, setTasaBCV] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [dolares, setDolares] = useState('');
  const [bolivares, setBolivares] = useState('');

  // 1. Buscamos la tasa al cargar el componente
  useEffect(() => {
    const obtenerTasa = async () => {
      try {
        const respuesta = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        const data = await respuesta.json();
        setTasaBCV(data.promedio); // Guardamos la tasa actual
        setCargando(false);
      } catch (error) {
        console.error("Error al obtener la tasa del BCV:", error);
        setCargando(false);
      }
    };

    obtenerTasa();
  }, []);

  // 2. Función para calcular cuando el usuario escribe Dólares
  const manejarDolares = (e) => {
    const valorUSD = e.target.value;
    setDolares(valorUSD);
    if (tasaBCV && valorUSD !== '') {
      setBolivares((valorUSD * tasaBCV).toFixed(2));
    } else {
      setBolivares('');
    }
  };

  // 3. Función para calcular cuando el usuario escribe Bolívares
  const manejarBolivares = (e) => {
    const valorBS = e.target.value;
    setBolivares(valorBS);
    if (tasaBCV && valorBS !== '') {
      setDolares((valorBS / tasaBCV).toFixed(2));
    } else {
      setDolares('');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '300px' }}>
      <h3>Conversor BCV</h3>
      
      {cargando ? (
        <p>Cargando tasa oficial...</p>
      ) : (
        <p style={{ color: 'green', fontWeight: 'bold' }}>
          Tasa BCV: {tasaBCV} Bs.
        </p>
      )}

      <div style={{ marginBottom: '10px' }}>
        <label>Dólares (USD):</label>
        <input 
          type="number" 
          value={dolares} 
          onChange={manejarDolares} 
          placeholder="0.00"
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>

      <div>
        <label>Bolívares (VES):</label>
        <input 
          type="number" 
          value={bolivares} 
          onChange={manejarBolivares} 
          placeholder="0.00"
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>
    </div>
  );
}