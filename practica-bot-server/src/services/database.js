const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/pratica_database.json');

class DatabaseService {
    constructor() {
        this.data = null;
        this.loadDatabase();
    }

    loadDatabase() {
        try {
            const rawData = fs.readFileSync(dbPath, 'utf8');
            this.data = JSON.parse(rawData);
            console.log('✅ Database loaded successfully.');
        } catch (error) {
            console.error('❌ Error loading database:', error.message);
            this.data = {};
        }
    }

    getEmpresa() {
        return this.data.empresa;
    }

    getEmpreendimentos() {
        return this.data.empreendimentos;
    }

    findEmpreendimento(query) {
        // Simple search logic
        const all = [
            ...this.data.empreendimentos.em_construcao,
            ...this.data.empreendimentos.em_lancamento,
            ...this.data.empreendimentos.entregues
        ];

        const normalizedQuery = query.toLowerCase();
        return all.find(e =>
            e.nome.toLowerCase().includes(normalizedQuery) ||
            e.id.toLowerCase().includes(normalizedQuery)
        );
    }
}

module.exports = new DatabaseService();
