import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import { QueryDto } from './dto/index';
import { Monument } from './interfaces/monument.interface';

const LIMIT = 100;
const LILLE_PAGE = 4;

const ARMENTIERES_URL = `https://opendata.lillemetropole.fr/api/explore/v2.1/catalog/datasets/monuments-historiques-armentieres/records?limit=${LIMIT}`;
const LILLE_URL = `https://opendata.lillemetropole.fr/api/explore/v2.1/catalog/datasets/monuments-historiques-lille/records?limit=${LIMIT}&offset=`;
const ROUBAIX_URL = `https://opendata.lillemetropole.fr/api/explore/v2.1/catalog/datasets/liste-monuments-historiques-de-roubaix/records?limit=${LIMIT}`;

@Injectable()
export class MonumentService {
  private monuments: Monument[] = [];
  private favoriteMonuments: Monument[] = [];

  // Récupère tous les monuments en fonctions des filtres
  async getAllMonuments(query: QueryDto) {
    const { date, lat, long, radius, type, ville } = query;

    // Récupère les monuments de chaque ville
    const [armentieresMonuments, lillesMonuments, roubaixMonuments] =
      await Promise.all([
        this.fetchArmentieresMonuments(),
        this.fetchLillesMonuments(),
        this.fetchRoubaixMonuments(),
      ]);

    this.monuments = [
      ...armentieresMonuments,
      ...lillesMonuments,
      ...roubaixMonuments,
    ];

    // Filtre par décennie
    if (date) {
      const startYear = Number(date);
      const endYear = Number(date) + 10;
      this.monuments = this.monuments.filter(
        (monument) => monument.date >= startYear && monument.date < endYear,
      );
    }

    // Filtre par rayon
    if (radius) {
      this.monuments = this.monuments.filter((monument) => {
        const distance = this.calculateDistance(
          lat,
          long,
          monument.lat,
          monument.long,
        );
        return distance <= radius;
      });
    } else {
      // Filtre par latitude
      if (lat) {
        this.monuments = this.monuments.filter(
          (monument) => monument.lat === Number(lat),
        );
      }

      // Filtre par longitude
      if (long) {
        this.monuments = this.monuments.filter(
          (monument) => monument.long === long,
        );
      }
    }

    // Filtre par type de monument
    if (type) {
      this.monuments = this.monuments.filter((monument) =>
        monument.type.toLowerCase().includes(type.toLowerCase()),
      );
    }

    // Filtre par ville
    if (ville) {
      this.monuments = this.monuments.filter(
        (monument) => monument.ville?.toLowerCase() === ville.toLowerCase(),
      );
    }

    return this.monuments;
  }

  // Ajoute un monument aux favoris
  addMonumentToFavourites(id: string) {
    const monument = this.monuments.find((monument) => monument.id === id);

    // Si le monument n'existe pas jette une exception
    if (!monument) {
      throw new HttpException(
        `No monument with id ${id}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const isAlreadyAFavourite = this.favoriteMonuments.find(
      (monument) => monument.id === id,
    );

    // Vérifie si le monument n'est pas déjà dans les favoris
    if (isAlreadyAFavourite) {
      throw new HttpException(
        `This monument is already a favorite`,
        HttpStatus.CONFLICT,
      );
    }

    this.favoriteMonuments.push(monument);

    return monument;
  }

  // Récupère les types de monuments
  getMonumentTypes() {
    const types = [
      ...new Set(
        this.monuments.map((monument) => monument.type.toLocaleLowerCase()),
      ),
    ].map((type, index) => ({ id: index, type }));
    return types;
  }

  // Récupère les monuments d'Armentières
  async fetchArmentieresMonuments() {
    const { data } = await axios(ARMENTIERES_URL);

    const monuments = data.results.map((monument: any) => {
      const {
        coordonnees_geographiques,
        appellation_courante,
        datation,
        commune,
      } = monument;
      const { lat, lon } = coordonnees_geographiques;
      const id = monument?.photo?.id;

      return {
        id,
        lat,
        long: lon,
        type: appellation_courante.split(' ')[0],
        date: datation && Number(datation),
        ville: commune,
      };
    });

    return monuments;
  }

  // Récupère les monuments de Lille
  async fetchLillesMonuments() {
    const data = await Promise.all(
      Array.from({ length: LILLE_PAGE }, async (_, i) => {
        const { data } = await axios(`${LILLE_URL}${i * 100}`);
        return data.results;
      }),
    );

    const monuments = data.flat().map((monument: any) => {
      const {
        id_merimee,
        coord_geo,
        denomination,
        datation_bati_lmcu,
        commune,
      } = monument;
      const coordGeo = coord_geo.split(', ');
      const lat = Number(coordGeo[0]);
      const long = Number(coordGeo[1]);

      return {
        id: id_merimee.toString(),
        lat,
        long,
        type: denomination.split(' ')[0],
        date: datation_bati_lmcu,
        ville: commune,
      };
    });

    return monuments;
  }

  // Récupère les monuments de Roubaix
  async fetchRoubaixMonuments() {
    const { data } = await axios(ROUBAIX_URL);
    const monuments = data.results.map((monument: any) => {
      const {
        monum_his_com_id,
        lat,
        long,
        appellation_courante,
        epoque,
        commune,
      } = monument;

      return {
        id: monum_his_com_id.toString(),
        lat: lat ? Number(lat) : null,
        long: long ? Number(long) : null,
        type: appellation_courante.split(' ')[0],
        date: epoque ? Number(epoque) : null,
        ville: commune,
      };
    });

    return monuments;
  }

  // Calcule la distance entre deux coordonnées géographiques
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371e3; // rayon de la Terre en mètres
    const φ1 = (lat1 * Math.PI) / 180; // φ, λ en radians
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // en mètres
  }
}
