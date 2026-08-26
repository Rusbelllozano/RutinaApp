import { program } from './data/program'
import { useSettingsStore } from './store/useSettingsStore'

function App() {
  const equipment = useSettingsStore((s) => s.equipment)

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 bg-slate-950 px-4 py-8 text-slate-100">
      <header>
        <h1 className="text-2xl font-semibold">Rutina</h1>
        <p className="text-sm text-slate-400">Scaffold listo — próximo paso: pantalla de inicio y rotación A-B-C.</p>
      </header>

      <section className="rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-2 text-lg font-medium">Días del programa</h2>
        <ul className="flex flex-col gap-2">
          {program.days.map((day) => (
            <li key={day.id} className="rounded-xl bg-slate-800 px-3 py-2">
              <span className="font-semibold">{day.id}</span> — {day.name}
              <span className="block text-xs text-slate-400">{day.muscleGroups.join(', ')}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-2 text-lg font-medium">Equipo (editable en Ajustes)</h2>
        <p className="text-sm text-slate-400">
          Barra larga: {equipment.barbell.weightKg} kg · Discos totales:{' '}
          {equipment.plates.reduce((acc, p) => acc + p.kg * p.quantity, 0)} kg
        </p>
      </section>
    </div>
  )
}

export default App
