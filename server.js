import express from "express";
import bodyParser from "body-parser";
import { param, validationResult } from "express-validator";
import helmet, { crossOriginResourcePolicy } from "helmet";
import axios from "axios";
import cors from "cors";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import crypto from "crypto";
import dotenv from "dotenv";
import dbConnection from "./db/database.js";
import {clubInfoModel, clubStatsOverviewModel, playerStatsModel} from "./db/models.js";  

// get the clubs info, stats and players stats for any team in Serie A, 
// update and delete players in Serie A clubsstore in mongoDB database and retrieve via Restful API

 
const app = express();
app.use(bodyParser.urlencoded({ extended: true}));
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
dbConnection();

const api_limit = rateLimit({
    windowMs: 60 * 60 * 2000, // 2 hour
    max: 100, 
    message: "Too many requests, try again later"
});

app.use(api_limit);

dotenv.config();

const port = process.env.SERVER_PORT;
let apiKey = process.env.SERVER_API_KEY;
const API = process.env.FOOTBALL_API;

const validate_team = [
    param("team")
    .isString().withMessage("The team name must be a valid string")
    .notEmpty().withMessage("The team name cannot be empty")
    .trim()
    .escape()
];

const apiKeyGenerator = function() {
    const key = crypto.createHmac("sha256", "1S4ion@hiUE#PI5-864")
    .update("($#ifnGBTOIEA")
    .digest("hex")

    return key;
} // 96957bc35438b1c48e00a4c6b0f37c3323357f5f32a0d6d963a1aa11634804f0

const myApiKey = apiKeyGenerator();

function api_config(team_id) {
    const config = {
        params: { 
            team: team_id,
            season: '2022',
            league: '135', // Serie A
        },
        headers: { 'x-apisports-key': apiKey },
    }    
    return config;
}
// napoli team id = 492

async function checkdb(model, team_name) {
    try {
        const team = String(team_name);
        const club_name = team[0].toUpperCase() + team.slice(1);
        // Check if the team is already in the database
        const existingTeam = await model.findOne({name: club_name});

        if (existingTeam) {
            // If team data exists, return it as JSON
            return existingTeam; // Return the team data in JSON format
        }
        
    } catch (err) {
        console.error("Error checking the database:", err);
    }
}

async function insertData(func_model, data) {
    const existingData = await func_model({ name: data.name });

    if (existingData) {
        return existingData;
    } else {
        const clubData = new func_model(data);
        await clubData.save();
    }
}

async function getData(model, team_name) {
    const team = String(team_name);
    const club_name = team[0].toUpperCase() + team.slice(1);

    try {
        const club = await model.findOne({name: club_name});

        if (!club) {
            console.log(`No club found with name: ${club_name}`);
            return { message: "Error, club not found" };
        }

        return club.toJSON();
    } catch(err) {
        console.log("cannot retrieve data", err);
        return {message: "Error, cannot retrieve club"};
    }

}

async function getAPIData(endpoint, team_name) {
    const team_data = await get_team(team_name);
    const id = team_data.club_id;
    const options = api_config(id);
    const data = await axios.get(API + endpoint, options); 
    const club = data.data.response;
    return club;
}

function apiKeyAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ message: 'API key is missing' });
      }
    
      if (apiKey !== myApiKey) {
        return res.status(403).json({ message: 'Invalid API key' });
      }
    else {
        if (myApiKey) {
            next();
        }
    }

}

async function get_team(team_name) {
    const config = {
        params: { 
            name: team_name,
            season: '2022',
            league: '135'
        },
        headers: { 'x-apisports-key': apiKey },
    };
    
    try {
        const api = await axios.get(API + "/teams", config);
        const response = api.data;
        const club = response.response[0];
        // replace with mongoDB 
        const club_info = {
            club_id: club.team.id,
            country: club.team.country,
            league: "Serie A",
            name: club.team.name,
            venue: club.venue.name, 
            capacity: club.venue.capacity, 
            founded: club.team.founded,
        };

                await clubInfoModel.insertMany(club_info);
        const clubData = await getData(clubInfoModel, team_name);

       return clubData;

    } catch(error) {
        return new Error("No data found");  
    }
}

app.get("/teams/:team", validate_team, apiKeyAuth, async (req, res) => {
   const team_name = req.params.team;

   const errors = validationResult(req);
   if (!errors.isEmpty()) {
       return res.status(400).json({error: errors.array()});
   }

    try {
        const teamData = await checkdb(clubInfoModel, team_name);
        if (teamData) {
            return res.json(teamData);
        } else {
            const team_data = await get_team(team_name);
            console.log("ass");
            return res.json(team_data);
        }
    } catch(error) {
        return res.status(500).json("No team data found");
    }
});


async function get_stats(team_name) {
    
   try {

    const club = await getAPIData("/teams/statistics", team_name);
    //console.log(club);
    const stats = { // replace with mongoDB 
        points: parseInt(3 * parseInt(club.fixtures.wins.total) + parseInt(club.fixtures.draws.total)),
        formation: club.lineups[0].formation,
        played: club.fixtures.played.total,
        home_goals: club.goals.for.total.home,
        away_goals: club.goals.for.total.away,
        clean_sheet: club.clean_sheet.total,
        wins: club.fixtures.wins.total,
        draw: club.fixtures.draws.total,
        loses: club.fixtures.loses.total,
        form: club.form
    };

    const club_stats = { // replace with mongoDB  
        league: club.league.name,
        season: club.league.season,
        name: club.team.name,
        country: club.league.country, 
        stats: stats
    };

    await clubStatsOverviewModel.insertMany(club_stats);
    const playerData = await getData(clubStatsOverviewModel, team_name);
    return playerData;

    } catch(error) {
        return res.status(500).json("No team data found");
    }

}

app.get("/teams/stats/:team", validate_team, apiKeyAuth, async (req, res) => {

   const team_name = req.params.team;

   const errors = validationResult(req);
   if (!errors.isEmpty()) {
       return res.status(400).json({error: errors.array()});
   }

   try {
    const teamStatsData = await checkdb(clubStatsOverviewModel, team_name);
    if (teamStatsData) {
        return res.json(teamStatsData);
    } else {
       const team_stats = await get_stats(team_name);
      return res.json(team_stats);
    }
 } catch(error) {
    return res.status(500).json("No team data found");
 }
 
});

async function getPlayer_stats(team_name) {
    try {

    const club = await getAPIData("/players", team_name);
    const players_stats = [];

    for (var i = 0; i < club.length; i++) {
          // Create an object for each player with their stats
          const player = club[i].player;
          const stats = club[i].statistics[0];

          players_stats.push({
            name: stats.team.name,
            league: stats.league.name,
            player: {
                first_name: player.firstname,
                last_name: player.lastname,
                age: player.age,
                nationality: player.nationality,
                height: player.height
            },
            stats: {
                appearences: stats.games.appearences,
                shots: {
                    total: stats.shots.total,
                    on: stats.shots.on
                },
                goals: {
                    total: stats.goals.total,
                    conceded: stats.goals.conceded,
                    assists: stats.goals.assists,
                    saves: stats.goals.saves
                },
                passes: {
                    total: stats.passes.total,
                    key: stats.passes.key,
                    accuracy: stats.passes.accuracy
                },
                tackles: {
                    total: stats.tackles.total,
                    blocks: stats.tackles.blocks,
                    interceptions: stats.tackles.interceptions
                },
                dribbles: {
                    attempts: stats.dribbles.attempts,
                    success: stats.dribbles.success,
                    past: stats.dribbles.past
                },
                cards: {
                    yellow: stats.cards.yellow,
                    yellowred: stats.cards.yellowred,
                    red: stats.cards.red
                },
                penalty: {
                    won: stats.penalty.won,
                    commited: stats.penalty.commited,
                    scored: stats.penalty.scored,
                    missed: stats.penalty.missed,
                    saved: stats.penalty.saved
                }
            }
          });
       }

    await playerStatsModel.insertMany(players_stats);
    const playerStatsData = await getData(playerStatsModel, team_name);
    return playerStatsData;

    } catch(err) {
        return res.status(500).json("no player stats data found");
    }
}

app.get("/teams/players/:team", validate_team, apiKeyAuth, async (req, res) => { // get players stats
    const team_name = req.params.team;
    const errors = validationResult(req);

   if (!errors.isEmpty()) {
       return res.status(400).json({error: errors.array()});
    }

   try {    
        const playerStatsData = await checkdb(playerStatsModel, team_name);
        if (playerStatsData) {
           const all_players = await playerStatsModel.find({});
            return res.json(all_players);
        } else {
                const player_stats = await getPlayer_stats(team_name);
                return res.json(player_stats);
        }

   } catch(error) {
        return res.status(500).json("no player stats data found");
   }

});

app.patch("/teams/info/:club", validate_team, apiKeyAuth, async (req, res) => { // update player in db
   // name of club must be the same in document to query
    const team_name = req.params.club;
    const { league, name, venue, capacity} = req.body;
    
    const updateClub = {
        league: league,
        name: name,
        venue: venue,
        capacity: capacity
    };

    try {
      const result = await clubInfoModel.updateOne({name: team_name}, updateClub);
     
      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "Club not found or no changes made." });
      }

      return res.json({message: "update successful!"});
    } catch (error) {
        return res.json({error: "could not update", error});
    }
});

app.post("/teams/club/:club", validate_team, apiKeyAuth, async (req, res) => { // add a club in db

    const team_name = req.params.club;
    
    try {
        const team_data = await get_team(team_name);
        return res.json(team_data); 
    } catch(err) {
        console.error("cant creat document", err);
        return res.status(500).json({ error: "Error creating team", err });
    }
});

app.delete("/teams/players/:player", validate_team, apiKeyAuth, async (req, res) => { // delete a player in db
    const player_name = req.params.player;
    try {
       const deletedPlayer = await playerStatsModel.findOneAndDelete({'player.first_name': player_name});
       if (deletedPlayer) {
            return res.json({message: `${player_name} player has been deleted` });
    } else {
            return res.status(404).json({message: `${player_name} not found` });
    }
       
    } catch (error) {
        console.error("cant delete player", error);
        return res.json({error: "Can't delete player", error});
    }
});

app.listen(port, () => {
    console.log("server on...");
}); 