import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";

const app = express();
app.use(bodyParser.urlencoded({ extended: true}));

dotenv.config();

const port = process.env.PORT;
const serieA_api = process.env.SERIE_A_API_KEY;
const api_key = process.env.API_KEY;

app.get("/club/:team", async (req, res) => {
    try {
         const get_club = await axios.get(serieA_api + "/teams/" + req.params.team, {
        headers: {
            "x-api-key": api_key
        }

    });

    res.json(get_club.data);

} catch(err) {
    console.error("Error fetching club data:", error);
    res.status(500).json({ message: "Error fetching club data" });
}

});

app.get("/club/stats/:team", async (req, res) => {
    try {
         const club_stats = await axios.get(serieA_api + `/teams/stats/${req.params.team}`, {
        headers: {
            "x-api-key": api_key
        }

    });

    res.json(club_stats.data);

} catch(err) {
    console.error("Error fetching club stats data:", error);
    res.status(500).json({ message: "Error fetching club stats data" });
}

});

app.get("/club/players/:team", async (req, res) => {
    try {
         const players_stats = await axios.get(serieA_api + `/teams/players/${req.params.team}`, {
        headers: {
            "x-api-key": api_key
        }

    });

    res.json(players_stats.data);

} catch(err) {
    console.error("Error fetching players stats data:", error);
    res.status(500).json({ message: "Error fetching players stats data" });
}

});

app.patch("/club/info/:team", async (req, res) => {
    try {
        // Extract the data from the body of the request
        const { league, name, venue, capacity } = req.body;
        
        // Prepare the data to be sent to the external API
        const updatedData = {
            league,
            name,
            venue,
            capacity
        };

        // Send the PATCH request to the external API (serieA_api)
        const updatedClub = await axios.patch(
            `${serieA_api}/teams/info/${req.params.team}`, 
            updatedData,  // Pass the actual data in the body of the request
            {
                headers: {
                    "x-api-key": api_key  // Add the API key header
                }
            }
        );

        // Send the response back to the client
        res.json(updatedClub.data);  // Send the external API's response

    } catch (error) {
        console.error("Error updating club stats:", error);
        res.status(500).json({ message: "Error updating club stats", error: error.message });
    }
});


app.delete("/club/players/:player", async (req, res) => {
    const player_name = req.params.player; // Player's name comes from the URL parameter

    try {
        // Find and delete the player based on first name (or other unique identifier)
        const deletedPlayer = await axios.delete(`${serieA_api}/teams/players/${player_name}`, {
            headers: {
                "x-api-key": api_key
            }
        });

        if (deletedPlayer.data) {
            return res.json({
                message: `${player_name} has been successfully deleted from the team.`
            });
        } else {
            return res.status(404).json({
                message: `Player ${player_name} not found.`
            });
        }
    } catch (error) {
        console.error("Error deleting player:", error);
        return res.status(500).json({
            error: "Error deleting player", 
            details: error
        });
    }
});


app.listen(port, () => {
    console.log("app server on..");
}); 
