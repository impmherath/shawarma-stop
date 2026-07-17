const API_URL = "http://localhost:5000/api";


async function loadDashboard(){

    try{

     const response = await fetch(
    `${API_URL}/dashboard/stats`,
    {
        method:"GET",
        credentials:"include",
        headers:{
            "Content-Type":"application/json"
        }
    }
);

        const data = await response.json();

console.log(data);


        document.getElementById("totalProducts")
        .innerHTML = data.totalProducts;


        document.getElementById("totalCategories")
        .innerHTML = data.totalCategories;


        document.getElementById("totalOrders")
        .innerHTML = data.totalOrders;


        document.getElementById("todaysOrders")
        .innerHTML = data.todaysOrders;



        const table =
        document.getElementById("ordersTable");


        table.innerHTML="";


        (data.recentOrders || []).forEach(order=>{


            table.innerHTML += `

            <tr>

            <td>${order.id}</td>

            <td>${order.customer_name}</td>

            <td>${order.status}</td>

            <td>${order.total_amount}</td>

            <td>${order.created_at}</td>

            </tr>

            `;


        });


    }
    catch(error){

        console.log(error);

    }

}



loadDashboard();