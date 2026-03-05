package tp.iut.fifa.pack;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import tp.iut.fifa.carte.Carte;

import java.util.HashMap;
import java.util.List;
import java.util.UUID;

@Component
public class StockagePacks {

    private final HashMap<String, List<Carte>> stockage = new HashMap<>();

    public synchronized String reserver() {
        String uuid;
        do {
            uuid = UUID.randomUUID().toString();
        } while (stockage.containsKey(uuid));
        stockage.put(uuid, null); // null = "pas encore prêt" (comme TP3)
        return uuid;
    }

    public synchronized List<Carte> obtenir(String uuid) {
        if (!stockage.containsKey(uuid)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "UUID inconnu");
        }
        List<Carte> result = stockage.get(uuid);
        if (result == null) {
            throw new ResponseStatusException(HttpStatus.PARTIAL_CONTENT, "Pack en cours");
        }
        return result;
    }

    public synchronized boolean mettreAJour(String uuid, List<Carte> cartes) {
        if (stockage.containsKey(uuid) && stockage.get(uuid) == null) {
            stockage.put(uuid, cartes);
            return true;
        }
        return false;
    }

    public synchronized boolean liberer(String uuid) {
        if (stockage.containsKey(uuid) && stockage.get(uuid) == null) {
            stockage.remove(uuid);
            return true;
        }
        return false;
    }
}