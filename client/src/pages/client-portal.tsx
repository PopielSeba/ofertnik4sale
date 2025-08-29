import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircleQuestion, Wrench, ShoppingCart } from "lucide-react";

export default function ClientPortal() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 via-blue-400 to-gray-100">
      <div className="container mx-auto px-4 py-16 flex flex-col justify-center items-center min-h-screen">
        {/* Back button */}
        <div className="absolute top-6 left-6">
          <button
            onClick={() => setLocation("/")}
            className="text-white hover:text-gray-200 transition-colors text-sm"
          >
            ← Powrót
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            Portal Klienta - Wyceny Online
          </h1>
          <p className="text-white/80 text-lg">
            Wybierz sposób współpracy - badanie potrzeb, katalog sprzętu lub sprzedaż
          </p>
        </div>

        {/* Three main cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl w-full">
          {/* Questions Card */}
          <Card 
            className="hover:scale-105 transition-transform duration-300 cursor-pointer bg-white/95 backdrop-blur-sm border-0 shadow-2xl"
            onClick={() => setLocation("/client-questions")}
          >
            <CardContent className="p-8 text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircleQuestion className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Wynajem - Badanie potrzeb
              </h2>
              <p className="text-gray-600">
                Pytamy → Odpowiadasz → Kontaktujemy się z Tobą z ofertą
              </p>
            </CardContent>
          </Card>

          {/* Catalog Card */}
          <Card 
            className="hover:scale-105 transition-transform duration-300 cursor-pointer bg-white/95 backdrop-blur-sm border-0 shadow-2xl"
            onClick={() => setLocation("/client-catalog")}
          >
            <CardContent className="p-8 text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Wynajem - Katalog
              </h2>
              <p className="text-gray-600">
                Samodzielnie skomponuj ofertę dopasowaną do Twoich potrzeb
              </p>
            </CardContent>
          </Card>

          {/* Sales Card */}
          <Card 
            className="hover:scale-105 transition-transform duration-300 cursor-pointer bg-white/95 backdrop-blur-sm border-0 shadow-2xl"
            onClick={() => setLocation("/client-sales")}
          >
            <CardContent className="p-8 text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Sprzedaż
              </h2>
              <p className="text-gray-600">
                Poznaj ofertę asortymentu przeznaczonego do sprzedaży
              </p>
            </CardContent>
          </Card>
        </div>

        {/* SEO Keywords */}
        <div className="mt-16 text-center text-white/60 text-xs max-w-4xl mx-auto">
          <p className="leading-relaxed">
            System wycen automatycznych | Wynajem sprzętu budowlanego | Ofertownik online | Portal klienta | Wyceniarka automatyczna | Katalog sprzętu | Badanie potrzeb | Wyceny online
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-white/70 text-xs">
          <p>System Wycen Ofertnik by PPP :: PROGRAM Sebastian Popiel, tel. +48 500 600 525</p>
        </div>
      </div>
    </div>
  );
}