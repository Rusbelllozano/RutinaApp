import { programa } from './data/programa'
import { useAjustesStore } from './store/useAjustesStore'

function App() {
  const equipo = useAjustesStore((s) => s.equipo)

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 bg-slate-950 px-4 py-8 text-slate-100">
      <header>
        <h1 className="text-2xl font-semibold">Rutina</h1>
        <p className="text-sm text-slate-400">Scaffold listo — próximo paso: pantalla de inicio y rotación A-B-C.</p>
      </header>

      <section className="rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-2 text-lg font-medium">Días del programa</h2>
        <ul className="flex flex-col gap-2">
          {programa.dias.map((dia) => (
            <li key={dia.id} className="rounded-xl bg-slate-800 px-3 py-2">
              <span className="font-semibold">{dia.id}</span> — {dia.nombre}
              <span className="block text-xs text-slate-400">{dia.musculos.join(', ')}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-2 text-lg font-medium">Equipo (editable en Ajustes)</h2>
        <p className="text-sm text-slate-400">
          Barra larga: {equipo.barraLarga.pesoKg} kg · Discos totales:{' '}
          {equipo.discos.reduce((acc, d) => acc + d.kg * d.cantidad, 0)} kg
        </p>
      </section>
    </div>
  )
}

export default App
