import mongoose from "mongoose";

const clubInfo_schema = new mongoose.Schema({
    club_id: Number,
    country: String,
    league: String, 
    name: String, 
    venue: String,    
    capacity: Number,
    founded: String,
});


const club_stats = new mongoose.Schema({
        points: Number,
        formation: String,
        played: Number,
        home_goals: Number,
        away_goals: Number,
        clean_sheet: Number,
        wins: Number,
        draw: Number,
        loses: Number,
        form: String
}); 

const clubStatsOverview = new mongoose.Schema({
    league: String,
    season: String,
    name: String,
    country: String,
    stats: club_stats,
});

// Define the schema for Player's performance stats
const playerStatsSchema = new mongoose.Schema({
    name: String,
    league: String,

    player: {
    first_name: String,
    last_name: String,
    age: Number,
    nationality: String,
    height: String,
    },

    stats: {
        appearences: Number,
        shots: {
            total: Number,
            on: Number,
        },
        goals: {
            total:Number,
            conceded: Number,
            assists: Number,
            saves: Number,
        },
        passes: {
            total: Number,
            key: Number,
            accuracy: Number,
        },
        tackles: {
            total: Number,
            blocks: Number,
            interceptions: Number,
        },
        dribbles: {
            attempts: Number,
            success: Number,
            past: Number,
        },
        cards: {
            yellow: Number,
            yellowred: Number,
            red: Number,
        },
        penalty: {
            won: Number,
            commited: Number,
            scored: Number,
            missed: Number,
            saved: Number,          
        }   
    }
});

const clubInfoModel = mongoose.model("ClubInfo", clubInfo_schema);
const clubStatsOverviewModel = mongoose.model("ClubStatsOverview", clubStatsOverview);
const playerStatsModel = mongoose.model('PlayerStats', playerStatsSchema);

export {clubInfoModel, clubStatsOverviewModel, playerStatsModel };