
async function testApiDados() {
  const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2dhdGV3YXkuYXBpYnJhc2lsLmlvL2FwaS92Mi9hdXRoL2xvZ2luIiwiaWF0IjoxNzY4NzYyNzgwLCJleHAiOjE4MDAyOTg3ODAsIm5iZiI6MTc2ODc2Mjc4MCwianRpIjoiOWFTRjl5cVRucHBndk5vQiIsInN1YiI6IjEwODYzIiwicHJ2IjoiMjNiZDVjODk0OWY2MDBhZGIzOWU3MDFjNDAwODcyZGI3YTU5NzZmNyJ9.RVk4-5N_lw3aB60Coa9VOl6tGqu5WRQS_EmnBE_ZVYA";
  const url = "https://gateway.apibrasil.io/api/v2/dados/cpf";
  
  const body = {
    cpf: "32855749840", // Using the same CPF as the other test
    homolog: true
  };

  console.log("Testing API Brasil (Dados) with body:", JSON.stringify(body));

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

testApiDados();
