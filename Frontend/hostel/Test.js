import { useEffect, useState } from "react";
import API from "./src/services/api";

function Test() {

    const [message, setMessage] = useState("");

    useEffect(() => {
        API.get("test/")
        .then(response => {
            setMessage(response.data.message);
        })
        .catch(error => console.log(error));
    }, []);

    return (
        <div>
            <h2>Backend Message:</h2>
            <p>{message}</p>
        </div>
    );
}

export default Test;