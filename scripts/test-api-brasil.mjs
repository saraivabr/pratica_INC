
async function testApi() {
  const token = process.env.CPF_SCORE_API_TOKEN || '';
  const url = "https://gateway.apibrasil.io/api/v2/consulta/cpf/credits";
  
  const body = {
    cpf: "32855749840", // Updated CPF
    tipo: "serasa-score-pf",
    homolog: true
  };

  console.log("Testing API Brasil with body:", JSON.stringify(body));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Response Data:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

testApi();
