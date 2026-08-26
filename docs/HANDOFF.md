# HANDOFF — App de rutina de entrenamiento (archivo vivo)

> **Para Claude Code.** Este documento contiene todo el contexto, los datos y los requisitos.
> No hace falta consultar otras fuentes. Adjunto: `rutina-6-dias.md` (el programa en texto plano).

---

## 1. Contexto del usuario

- **Objetivo:** ganar músculo + perder grasa (recomposición).
- **Nivel:** principiante, menos de 1 año entrenando.
- **Frecuencia:** lunes a sábado, domingo descanso. Necesita tolerar fallar 1 día sin romper el plan.
- **Duración por sesión:** 35–55 min, calentamiento y estiramiento incluidos.
- **Lugar:** casa. Sin banco, sin barra de dominadas. Solo colchoneta y peso libre.
- **Idioma de toda la interfaz: español.**
- **Uso principal: teléfono**, con las manos ocupadas y a veces sudadas. Botones grandes, poco scroll, cero formularios largos.

### Equipo exacto (esto es un límite duro del diseño)

| Ítem | Cantidad | Peso unitario |
|---|---|---|
| Barra armable 1.69 m | 1 | ~6 kg (configurable) |
| Barra mancuerna 35 cm | 2 | ~1.5 kg c/u (configurable) |
| Seguros roscados | 6 | ~0.2 kg c/u |
| Disco 1.25 kg | 4 | 1.25 kg |
| Disco 2.5 kg | 6 | 2.5 kg |
| Disco 5 kg | 4 | 5 kg |

**Total de discos: 40 kg.** Los pesos de barras son estimados: deben ser editables en ajustes.

---

## 2. Qué construir

Una **app web de una sola página, offline-first**, que el usuario abre en el celular durante el entrenamiento. Es un "archivo vivo": registra cada serie, recuerda el historial y decide qué toca hacer hoy.

No es un documento estático ni un PDF. Es una herramienta de sesión.

### Stack sugerido (abierto a criterio)

- React + Vite + Tailwind, o HTML/JS vanilla en un solo archivo. Prioridad: que arranque sin servidor y sin build complicado.
- **Persistencia: `localStorage`** (o IndexedDB si el volumen lo justifica). Sin backend, sin cuentas, sin red.
- Debe funcionar 100% sin conexión salvo los enlaces de video, que abren YouTube externamente.
- Incluir **exportar/importar JSON** para que el usuario no pierda el historial al cambiar de dispositivo o limpiar el navegador. Esto no es opcional.

---

## 3. Reglas de negocio

### 3.1 Rotación A–B–C (el corazón de la app)

Los días **no** están atados a la semana. Existe una cola cíclica `A → B → C → A → B → C → …`.

- Al abrir la app, muestra **el siguiente día de la rotación**, sea la fecha que sea.
- Si el usuario falla un día, no pasa nada: al día siguiente le toca lo mismo que le tocaba. Nada se "pierde" y no hay que recuperar sesiones.
- Domingo: la app sugiere descanso, pero **no bloquea** entrenar si el usuario quiere.
- Nunca mostrar mensajes de culpa por días perdidos. Nada de rachas rotas en rojo, nada de "fallaste 2 días". Si acaso, un empujón neutro: "Llevas 3 días sin entrenar. La sesión mínima son 20 minutos."

### 3.2 Doble progresión

Es la única regla de progresión del programa.

1. Cada ejercicio tiene un rango de reps (ej. 8–12).
2. El usuario intenta sumar 1 rep por serie cada semana.
3. Cuando completa **el límite alto en todas las series** (ej. 4×12), la app sugiere subir **+2.5 kg** y volver al límite bajo.
4. La sugerencia es una **propuesta, no una orden**: botón "Aceptar" / "Todavía no".

La app debe detectar esto automáticamente comparando con la última sesión registrada de ese ejercicio.

### 3.3 Salto mínimo

- Barra: 2.5 kg (1.25 kg por lado).
- Mancuerna: 2.5 kg (1.25 kg por extremo).
- **Nunca sugerir cargas asimétricas.** Si un peso no es armable con el inventario, no existe.

### 3.4 Deload

Cada 6–8 semanas de entrenamiento acumulado, la app avisa: "Semana de descarga: usa el 60% del peso habitual." Aplica el 60% redondeado a la carga armable más cercana durante 6 sesiones y luego vuelve solo.

### 3.5 Sesión mínima

Botón visible **"Versión mínima (20 min)"**: recorta la sesión a los primeros 3 ejercicios, 2 series cada uno. Cuenta como sesión completa para la rotación y el historial. Es el mecanismo antideserción más importante de la app: debe ser fácil de encontrar, no estar escondido.

---

## 4. Calculadora de discos (feature central)

Dado un peso objetivo, la app dice **exactamente qué discos poner**. Y dado el inventario, dice **qué pesos son posibles**.

### Reglas

- **Barra:** los discos se reparten simétricamente en 2 lados. Un peso es armable si existe una combinación del inventario tal que `lado_izq == lado_der`.
  - Rango real: **6 kg (barra sola) a 46 kg**, en saltos de 2.5 kg.
- **Mancuerna individual** (goblet, pullover, remo a una mano): 2 extremos simétricos.
- **Par de mancuernas:** cada tipo de disco usado debe alcanzar para **4 extremos**. Ojo con este límite: hay 6 discos de 2.5 kg, así que solo 4 son usables en un par (1 por extremo); sobran 2.
  - Máximo por mancuerna en un par: 1.25 + 2.5 + 5 por extremo = **19 kg c/u** (usa todos los discos).

### Conflicto de inventario (importante)

Los 40 kg de discos son compartidos entre las 3 barras. La app debe **detectar y avisar** cuando la configuración de un ejercicio no es armable porque los discos están en otra barra dentro de la misma sesión.

Además, debe **ordenar los ejercicios de la sesión para minimizar los cambios de discos**. Este es un requisito real de usabilidad, no un adorno: cambiar discos a mitad de sesión es lo que más fricción genera.

---

## 5. Funcionalidades

### Imprescindibles (v1)

1. **Pantalla de inicio:** qué día toca (A/B/C), duración estimada, botón grande "Empezar" + botón "Versión mínima".
2. **Calentamiento:** checklist de 7 ítems, con opción de saltar.
3. **Modo sesión:** un ejercicio a la vez, no una tabla larga. Por cada ejercicio muestra:
   - Nombre, series × rango de reps, carga sugerida y **qué discos poner**.
   - Lo que hizo la última vez ("La vez pasada: 3×10 con 12 kg").
   - Campos para registrar peso y reps de cada serie, precargados con la sugerencia — que confirmar sea **un toque**.
   - Enlace ▶ al video de demostración.
4. **Temporizador de descanso:** arranca solo al registrar una serie, con el tiempo prescrito (45/60/75/90 s). Sonido o vibración al terminar. Debe poder saltarse.
5. **Estiramiento final:** checklist de 7 ítems.
6. **Historial:** por ejercicio, peso y reps a lo largo del tiempo. Una gráfica simple de carga por ejercicio ya aporta muchísimo.
7. **Ajustes:** peso de barras, inventario de discos, sonido on/off, resetear rotación.
8. **Exportar / importar JSON.**

### Deseables (v2, no bloquean)

- Marcar un ejercicio como "molesta la articulación" y que ofrezca la alternativa ya definida en las notas.
- Notas libres por sesión.
- Vista de volumen semanal por grupo muscular.
- Aviso de deload automático.

### Fuera de alcance

- Cuentas de usuario, sincronización, backend.
- Conteo de calorías o registro de comidas. La app es solo de entrenamiento.
- **No incluir peso corporal, medidas ni fotos de progreso en v1.** El objetivo del usuario es recomposición y el peso en báscula se mueve de forma engañosa en ese escenario; un número diario visible desmotiva más de lo que informa.

---

## 6. Datos del programa

Estructura sugerida. Los pesos iniciales ya están calculados para el inventario real y ordenados para minimizar cambios de discos.

```json
{
  "equipo": {
    "barraLarga": { "pesoKg": 6, "longitudCm": 169 },
    "barraMancuerna": { "pesoKg": 1.5, "cantidad": 2, "longitudCm": 35 },
    "seguros": { "cantidad": 6, "pesoKg": 0.2 },
    "discos": [
      { "kg": 1.25, "cantidad": 4 },
      { "kg": 2.5, "cantidad": 6 },
      { "kg": 5, "cantidad": 4 }
    ]
  },

  "calentamiento": [
    { "nombre": "Marcha en el sitio o jumping jacks", "duracion": "2 min" },
    { "nombre": "Círculos de brazos adelante/atrás", "reps": "20 c/u" },
    { "nombre": "Gato-camello", "reps": "10" },
    { "nombre": "Puente de glúteo sin peso", "reps": "15" },
    { "nombre": "Sentadilla sin peso lenta", "reps": "10" },
    { "nombre": "Rotaciones de cadera y tobillo", "reps": "10 c/lado" },
    { "nombre": "1 serie ligera del primer ejercicio (50% del peso, 10 reps)" }
  ],

  "estiramiento": [
    "Pectoral en marco de puerta (30 s)",
    "Tríceps sobre la cabeza (30 s)",
    "Isquiotibiales sentado, una pierna a la vez (30 s)",
    "Cuádriceps de pie (30 s)",
    "Flexor de cadera en zancada (30 s)",
    "Postura del niño (30 s)",
    "Cuello lateral (10 s por lado)"
  ],

  "dias": [
    {
      "id": "A",
      "nombre": "Empuje",
      "musculos": ["pecho", "hombros", "tríceps"],
      "ejercicios": [
        {
          "orden": 1, "nombre": "Press de pecho en piso con mancuernas",
          "series": 4, "repMin": 8, "repMax": 12, "descansoSeg": 90,
          "implemento": "par_mancuernas", "cargaInicialKg": 12,
          "discos": "5 kg en cada extremo",
          "alternativa": "Si no llegas a 8 reps limpias, baja a 9.5 kg (2.5 + 1.25 por extremo)",
          "video": "https://www.youtube.com/results?search_query=press+en+piso+con+mancuernas+tecnica",
          "nota": "Baja hasta que el codo toque el suelo, pausa 1 s, sube."
        },
        {
          "orden": 2, "nombre": "Press militar de pie con barra",
          "series": 3, "repMin": 8, "repMax": 12, "descansoSeg": 90,
          "implemento": "barra", "cargaInicialKg": 11, "discos": "2.5 kg por lado",
          "video": "https://www.youtube.com/results?search_query=press+militar+de+pie+con+barra+tecnica"
        },
        {
          "orden": 3, "nombre": "Aperturas en piso con mancuernas",
          "series": 3, "repMin": 12, "repMax": 15, "descansoSeg": 60,
          "implemento": "par_mancuernas", "cargaInicialKg": 7, "discos": "2.5 kg en cada extremo",
          "video": "https://www.youtube.com/results?search_query=aperturas+en+piso+con+mancuernas"
        },
        {
          "orden": 4, "nombre": "Elevaciones laterales",
          "series": 3, "repMin": 12, "repMax": 15, "descansoSeg": 60,
          "implemento": "par_mancuernas", "cargaInicialKg": 4.5, "discos": "1.25 kg en cada extremo",
          "alternativa": "Si los hombros se van hacia arriba, usa las barras solas (~2 kg)",
          "video": "https://www.youtube.com/results?search_query=elevaciones+laterales+con+mancuernas+tecnica"
        },
        {
          "orden": 5, "nombre": "Extensión de tríceps sobre la cabeza",
          "series": 3, "repMin": 10, "repMax": 12, "descansoSeg": 60,
          "implemento": "barra", "cargaInicialKg": 11, "discos": "la misma barra, sin tocar",
          "alternativa": "Si molesta el codo, una sola mancuerna de 9.5 kg con las dos manos",
          "video": "https://www.youtube.com/results?search_query=extension+de+triceps+sobre+la+cabeza"
        },
        {
          "orden": 6, "nombre": "Flexiones (rodillas si hace falta)",
          "series": 2, "reps": "máximas", "descansoSeg": 60, "implemento": "peso_corporal",
          "video": "https://www.youtube.com/results?search_query=flexiones+de+pecho+tecnica+correcta"
        },
        {
          "orden": 7, "nombre": "Plancha frontal",
          "series": 3, "duracionSeg": [30, 45], "descansoSeg": 45, "implemento": "peso_corporal",
          "video": "https://www.youtube.com/results?search_query=plancha+abdominal+tecnica+correcta"
        }
      ]
    },

    {
      "id": "B",
      "nombre": "Pierna + Core",
      "musculos": ["cuádriceps", "femorales", "glúteos", "pantorrillas", "core"],
      "ejercicios": [
        {
          "orden": 1, "nombre": "Sentadilla con barra en la espalda",
          "series": 4, "repMin": 10, "repMax": 12, "descansoSeg": 90,
          "implemento": "barra", "cargaInicialKg": 21, "discos": "5 + 2.5 por lado",
          "alternativa": "Primeras 2 semanas: 16 kg (un disco de 5 por lado). O goblet con mancuerna.",
          "video": "https://www.youtube.com/results?search_query=sentadilla+con+barra+tecnica+correcta"
        },
        {
          "orden": 2, "nombre": "Peso muerto rumano con barra",
          "series": 4, "repMin": 10, "repMax": 12, "descansoSeg": 90,
          "implemento": "barra", "cargaInicialKg": 21, "discos": "la misma barra, sin tocar",
          "video": "https://www.youtube.com/results?search_query=peso+muerto+rumano+con+barra+tecnica",
          "nota": "Espalda recta, rodillas casi rectas. El estiramiento se siente en el femoral, no en la lumbar."
        },
        {
          "orden": 3, "nombre": "Zancadas estáticas con mancuernas",
          "series": 3, "reps": "10 por pierna", "descansoSeg": 75,
          "implemento": "par_mancuernas", "cargaInicialKg": 7, "discos": "2.5 kg en cada extremo",
          "video": "https://www.youtube.com/results?search_query=zancadas+con+mancuernas+tecnica"
        },
        {
          "orden": 4, "nombre": "Puente de glúteo con barra sobre la cadera",
          "series": 3, "repMin": 15, "repMax": 15, "descansoSeg": 60,
          "implemento": "barra", "cargaInicialKg": 31, "discos": "añade los 2 discos de 5 kg sobrantes: 5 + 5 + 2.5 por lado",
          "video": "https://www.youtube.com/results?search_query=puente+de+gluteo+con+barra"
        },
        {
          "orden": 5, "nombre": "Elevación de talones con barra",
          "series": 3, "repMin": 15, "repMax": 20, "descansoSeg": 45,
          "implemento": "barra", "cargaInicialKg": 31, "discos": "la misma barra, sin tocar",
          "video": "https://www.youtube.com/results?search_query=elevacion+de+talones+con+barra+pantorrilla"
        },
        {
          "orden": 6, "nombre": "Dead bug", "series": 3, "reps": "10 por lado",
          "descansoSeg": 45, "implemento": "peso_corporal",
          "video": "https://www.youtube.com/results?search_query=dead+bug+ejercicio+abdominal"
        },
        {
          "orden": 7, "nombre": "Plancha lateral", "series": 3, "duracionSeg": 25,
          "descansoSeg": 45, "implemento": "peso_corporal",
          "video": "https://www.youtube.com/results?search_query=plancha+lateral+tecnica"
        }
      ]
    },

    {
      "id": "C",
      "nombre": "Tirón",
      "musculos": ["espalda", "bíceps", "deltoides posterior"],
      "ejercicios": [
        {
          "orden": 1, "nombre": "Remo con barra inclinado (torso a 45°)",
          "series": 4, "repMin": 8, "repMax": 12, "descansoSeg": 90,
          "implemento": "barra", "cargaInicialKg": 21, "discos": "5 + 2.5 por lado",
          "video": "https://www.youtube.com/results?search_query=remo+con+barra+inclinado+tecnica"
        },
        {
          "orden": 2, "nombre": "Remo a una mano con mancuerna",
          "series": 3, "reps": "10-12 por lado", "descansoSeg": 75,
          "implemento": "mancuerna_individual", "cargaInicialKg": 11.5, "discos": "5 kg en cada extremo (los 2 que quedan libres)",
          "video": "https://www.youtube.com/results?search_query=remo+a+una+mano+con+mancuerna"
        },
        {
          "orden": 3, "nombre": "Pull-over en piso con una mancuerna",
          "series": 3, "repMin": 12, "repMax": 15, "descansoSeg": 60,
          "implemento": "mancuerna_individual", "cargaInicialKg": 6.5, "discos": "2.5 kg en cada extremo",
          "video": "https://www.youtube.com/results?search_query=pullover+con+mancuerna+en+el+piso"
        },
        {
          "orden": 4, "nombre": "Pájaros / aperturas invertidas inclinado",
          "series": 3, "repMin": 12, "repMax": 15, "descansoSeg": 60,
          "implemento": "par_mancuernas", "cargaInicialKg": 4.5, "discos": "1.25 kg en cada extremo",
          "video": "https://www.youtube.com/results?search_query=pajaros+con+mancuernas+deltoides+posterior"
        },
        {
          "orden": 5, "nombre": "Curl de bíceps con barra",
          "series": 3, "repMin": 10, "repMax": 12, "descansoSeg": 60,
          "implemento": "barra", "cargaInicialKg": 11, "discos": "quita hasta dejar 2.5 por lado",
          "video": "https://www.youtube.com/results?search_query=curl+de+biceps+con+barra+tecnica"
        },
        {
          "orden": 6, "nombre": "Curl martillo con mancuernas",
          "series": 3, "repMin": 12, "repMax": 12, "descansoSeg": 60,
          "implemento": "par_mancuernas", "cargaInicialKg": 7, "discos": "2.5 kg en cada extremo",
          "video": "https://www.youtube.com/results?search_query=curl+martillo+con+mancuernas"
        },
        {
          "orden": 7, "nombre": "Hollow hold o bicicleta abdominal",
          "series": 3, "duracionSeg": 30, "descansoSeg": 45, "implemento": "peso_corporal",
          "video": "https://www.youtube.com/results?search_query=hollow+hold+ejercicio+abdominal"
        }
      ]
    }
  ]
}
```

---

## 7. Techo de carga y qué hacer cuando llegue

Las piernas van a topar primero: **46 kg es el máximo absoluto de la barra** y en unos meses se queda corto para sentadilla. La app no debe sugerir comprar discos. Cuando un ejercicio lleve 3 semanas en el peso máximo armable, debe ofrecer estas progresiones alternativas, en este orden:

1. **Tempo:** bajar en 3 s, pausa 1 s abajo, subir en 1 s.
2. **Pausa** de 2 s en el punto más difícil.
3. **Unilateral:** sentadilla búlgara, peso muerto a una pierna.
4. **Menos descanso:** bajar a 45 s.
5. **Más reps:** subir el rango a 15–20.

Idealmente el registro guarda el tempo/variante usada, para que el historial siga siendo comparable.

---

## 8. Criterios de aceptación

- [ ] Abro la app y en menos de 3 segundos sé qué día me toca y qué discos poner en el primer ejercicio.
- [ ] Registrar una serie es **un toque** si el peso y las reps sugeridas son correctos.
- [ ] Si no entreno el miércoles, el jueves me aparece exactamente lo que me tocaba el miércoles.
- [ ] La app nunca sugiere una carga que no se puede armar con 4×1.25 + 6×2.5 + 4×5 kg.
- [ ] Al completar 4×12 en un ejercicio, la próxima vez me propone +2.5 kg y puedo rechazarlo.
- [ ] Cierro el navegador, vuelvo mañana y todo el historial sigue ahí.
- [ ] Puedo exportar mi historial a un archivo y volver a importarlo.
- [ ] Todo se usa con una mano, en pantalla de teléfono, sin hacer zoom.
- [ ] Ningún texto de la interfaz culpa al usuario por faltar.

---

## 9. Decisiones que puede tomar Claude Code

Sin necesidad de preguntar: framework, estructura de archivos, diseño visual, nombres internos, forma exacta de las gráficas, y si la persistencia es `localStorage` o IndexedDB.

**Sí conviene preguntar antes de implementar:** cualquier cosa que cambie el programa de entrenamiento en sí (ejercicios, series, reps, cargas iniciales, rotación). Esos números están calculados para el inventario real y no deben improvisarse.
