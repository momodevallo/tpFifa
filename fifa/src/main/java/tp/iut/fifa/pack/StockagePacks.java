package tp.iut.fifa.pack;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tp.iut.fifa.carte.Carte;

public class StockagePacks {
    private final HashMap<String, List<Carte>> stockage = new HashMap<>();

    public synchronized String reserver() {
        String uuid;
        do {
            uuid = UUID.randomUUID().toString();
        } while (stockage.containsKey(uuid));
        stockage.put(uuid, null);
        return uuid;
    }

    public synchronized List<Carte> obtenir(String uuid) {
        List<Carte> result = stockage.get(uuid);
        if (result == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "UUID inconnu");
        }
        if (result.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.PARTIAL_CONTENT, "Pack en cours");
        }
        return result;
    }

    public synchronized boolean mettreAJour(String uuid, List<Carte> cartes) {
        if (stockage.get(uuid) == null) {
            stockage.put(uuid, cartes);
            return true;
        }
        return false;
    }
}
