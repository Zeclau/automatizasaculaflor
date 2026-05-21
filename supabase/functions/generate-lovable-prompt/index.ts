import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

serve(async (req) => {
  try {
    const payload = await req.json()
    const { record } = payload

    if (!record || !record.id) {
      return new Response(JSON.stringify({ error: "No se encontró el registro de la propiedad" }), { status: 400 })
    }

    const groqApiKey = Deno.env.get("GROQ_API_KEY")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!groqApiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Faltan variables de entorno esenciales" }), { status: 500 })
    }

    const systemPrompt = `Eres un Ingeniero de Prompts Senior y experto en Copywriting para Bienes Raíces de Lujo. Tu objetivo es transformar un JSON crudo de una propiedad en un PROMPT MAESTRO optimizado para herramientas de generación de UI (como Lovable.dev o v0).
El prompt que generes debe guiar a la IA para construir una Single Property Website (SPW) ultra premium, moderna y persuasiva.
INSTRUCCIONES PARA TU SALIDA:
1. Devuelve ÚNICAMENTE el prompt final que el usuario copiará y pegará en Lovable. No agregues introducciones como "Aquí está tu prompt".
2. Estructura el prompt para Lovable usando secciones claras (Estructura, Estilo, Componentes, Contenido).
3. Adapta el tono de las descripciones según el precio y tipo de propiedad.
4. Deja marcadores de posición claros como [INSERTAR IMAGEN AQUÍ] donde el usuario deba arrastrar sus archivos manualmente en Lovable.`

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Genera el prompt de Lovable para esta propiedad: ${JSON.stringify(record)}` }
        ]
      })
    })

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text()
      throw new Error(`Error de Groq: ${errorData}`)
    }

    const groqData = await groqResponse.json()
    const generatedPrompt = groqData.choices[0].message.content

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { error: updateError } = await supabase
      .from("properties")
      .update({ lovable_prompt: generatedPrompt })
      .eq("id", record.id)

    if (updateError) {
      throw new Error(`Error actualizando la tabla properties: ${updateError.message}`)
    }

    return new Response(JSON.stringify({ success: true, message: "Prompt guardado con éxito" }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    })
  }
})
