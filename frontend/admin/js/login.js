
console.log("login.js loaded");

const API_URL = "http://localhost:5000/api";


async function login(){

    console.log("LOGIN CLICKED");

    const username =
    document.getElementById("username").value;


    const password =
    document.getElementById("password").value;


    const message =
    document.getElementById("message");


    try{

        const response = await fetch(
            `${API_URL}/auth/login`,
            {
                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },

                credentials:"include",

                body:JSON.stringify({
                    username,
                    password
                })
            }
        );


        const data = await response.json();


        console.log(data);


        if(response.ok){

            window.location.href =
            "dashboard.html";

        }
        else{

            message.innerHTML =
            data.error || "Login Failed";

        }


    }
    catch(error){

        console.log(error);

        message.innerHTML =
        "Backend connection error";

    }

}
window.login = login;